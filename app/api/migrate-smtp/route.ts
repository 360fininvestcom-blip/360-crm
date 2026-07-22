import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// One-time migration endpoint to populate smtp_config_id for sequences
export async function POST() {
    try {
        // Get all sequences without smtp_config_id
        const sequences: any[] = await prisma.$queryRaw`
            SELECT id, organization_id, name, smtp_config_id 
            FROM email_sequences
        `;

        const updates = [];
        const results = [];

        for (const seq of sequences || []) {
            // Find first active SMTP config for this org
            const smtpConfigs: any[] = await prisma.$queryRaw`
                SELECT id FROM smtp_configs
                WHERE organization_id = CAST(${seq.organization_id} AS UUID)
                  AND is_active = true
                ORDER BY created_at ASC
                LIMIT 1
            `;
            
            const smtpConfig = smtpConfigs[0];

            if (smtpConfig && !seq.smtp_config_id) {
                updates.push({
                    id: seq.id,
                    smtp_config_id: smtpConfig.id
                });

                // Update the sequence
                await prisma.$executeRaw`
                    UPDATE email_sequences
                    SET smtp_config_id = CAST(${smtpConfig.id} AS UUID)
                    WHERE id = CAST(${seq.id} AS UUID)
                `.catch(e => {
                    results.push({
                        sequence_name: seq.name,
                        status: 'error',
                        error: e.message
                    });
                }).then(() => {
                    results.push({
                        sequence_name: seq.name,
                        status: 'updated',
                    });
                });
            } else if (seq.smtp_config_id) {
                results.push({
                    sequence_name: seq.name,
                    status: 'already_has_smtp'
                });
            } else {
                results.push({
                    sequence_name: seq.name,
                    status: 'no_smtp_config_found'
                });
            }
        }

        return NextResponse.json({
            success: true,
            updated: updates.length,
            results
        });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
