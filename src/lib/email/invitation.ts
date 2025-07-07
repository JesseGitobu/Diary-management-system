import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface InvitationEmailData {
  inviteeName: string
  inviteeEmail: string
  farmName: string
  inviterName: string
  roleType: string
  invitationLink: string
  expiresAt: string
}

export async function sendInvitationEmail(data: InvitationEmailData) {
  try {
    console.log('Sending invitation email to:', data.inviteeEmail)
    
    const emailHtml = generateInvitationEmailHTML(data)
    
    const { data: result, error } = await resend.emails.send({
      from: 'DairyTrack Pro <onboarding@resend.dev>', // You'll need to verify this domain
      to: [data.inviteeEmail],
      subject: `Join ${data.farmName} on DairyTrack Pro`,
      html: emailHtml,
    })

    if (error) {
      console.error('Resend error:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log('Email sent successfully via Resend:', result?.id)
    return { 
      success: true, 
      emailSent: true, 
      messageId: result?.id 
    }
  } catch (error) {
    console.error('Error sending invitation email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
}

function generateInvitationEmailHTML(data: InvitationEmailData): string {
  const expiryDate = new Date(data.expiresAt).toLocaleDateString()
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Join ${data.farmName} on DairyTrack Pro</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                margin: 0; 
                padding: 0; 
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background-color: #ffffff; 
            }
            .header { 
                background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); 
                color: white; 
                padding: 40px 20px; 
                text-align: center; 
                border-radius: 8px 8px 0 0; 
            }
            .header h1 { 
                margin: 0 0 10px 0; 
                font-size: 28px; 
                font-weight: 700; 
            }
            .header h2 { 
                margin: 0; 
                font-size: 18px; 
                font-weight: 400; 
                opacity: 0.9; 
            }
            .content { 
                padding: 40px 30px; 
                background-color: #ffffff; 
            }
            .content p { 
                margin: 0 0 16px 0; 
                font-size: 16px; 
            }
            .content ul { 
                margin: 20px 0; 
                padding-left: 20px; 
            }
            .content li { 
                margin: 8px 0; 
                font-size: 15px; 
            }
            .button-container { 
                text-align: center; 
                margin: 32px 0; 
            }
            .button { 
                display: inline-block; 
                background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); 
                color: white; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600; 
                font-size: 16px; 
                box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3); 
                transition: transform 0.2s; 
            }
            .button:hover { 
                transform: translateY(-2px); 
            }
            .highlight { 
                background-color: #fef3c7; 
                padding: 2px 6px; 
                border-radius: 4px; 
                font-weight: 600; 
            }
            .important-box { 
                background-color: #fef3c7; 
                border-left: 4px solid #f59e0b; 
                padding: 16px; 
                margin: 24px 0; 
                border-radius: 0 4px 4px 0; 
            }
            .footer { 
                padding: 30px; 
                text-align: center; 
                color: #6b7280; 
                font-size: 14px; 
                background-color: #f9fafb; 
                border-radius: 0 0 8px 8px; 
            }
            .footer p { 
                margin: 8px 0; 
            }
            .footer .logo { 
                color: #16a34a; 
                font-weight: 600; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🐄 FarmTrack Pro</h1>
                <h2>You're invited to join ${data.farmName}!</h2>
            </div>
            
            <div class="content">
                <p>Hello <strong>${data.inviteeName}</strong>,</p>
                
                <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.farmName}</strong> as a <span class="highlight">${data.roleType.replace('_', ' ')}</span> on FarmTrack Pro.</p>
                
                <p>FarmTrack Pro is a comprehensive dairy farm management platform that helps you:</p>
                <ul>
                    <li>📊 Track animal health and production records</li>
                    <li>🐮 Manage herd information and breeding cycles</li>
                    <li>👥 Collaborate with your team members</li>
                    <li>📈 Generate detailed reports and analytics</li>
                </ul>
                
                <div class="button-container">
                    <a href="${data.invitationLink}" class="button">Accept Invitation</a>
                </div>
                
                <div class="important-box">
                    <p><strong>⏰ Important:</strong> This invitation will expire on <strong>${expiryDate}</strong>.</p>
                </div>
                
                <p>If you have any questions, please contact ${data.inviterName} or our support team.</p>
                
                <p>Welcome to the team! 🎉</p>
            </div>
            
            <div class="footer">
                <p>This invitation was sent by <strong>${data.inviterName}</strong> from <strong>${data.farmName}</strong></p>
                <p>If you did not expect this invitation, you can safely ignore this email.</p>
                <p class="logo">© 2024 FarmTrack Pro. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `
}

export function generateInvitationLink(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/invite/${token}`
}