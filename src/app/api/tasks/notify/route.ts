import { NextRequest, NextResponse } from 'next/server'
import { BrevoClient } from '@getbrevo/brevo'

const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY || '' })

const FROM = { email: 'createhubportal@createfoundation.ph', name: 'Create Hub Portal' }

type Recipient = { name: string; email: string }

async function sendEmail(to: Recipient, subject: string, htmlContent: string) {
  await client.transactionalEmails.sendTransacEmail({
    sender: FROM,
    to: [{ email: to.email, name: to.name }],
    subject,
    htmlContent,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, task, assignees, creator } = body

    const assigneeRecipients: Recipient[] = (assignees || []).filter((a: any) => a.email)
    const creatorRecipient: Recipient | null = creator?.email ? creator : null

    if (type === 'created') {
      for (const assignee of assigneeRecipients) {
        await sendEmail(
          assignee,
          `New Task Assigned: ${task.title}`,
          `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #FF6347;">You've been assigned a task</h2>
              <p>Hi ${assignee.name},</p>
              <p><strong>${creator?.name ?? 'A superadmin'}</strong> has assigned you a new task.</p>
              <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px;"><strong>Task:</strong> ${task.title}</p>
                ${task.description ? `<p style="margin: 0 0 8px;"><strong>Description:</strong> ${task.description}</p>` : ''}
                <p style="margin: 0 0 8px;"><strong>Due Date:</strong> ${task.due_date ?? 'No due date'}</p>
                <p style="margin: 0;"><strong>Status:</strong> ${task.status}</p>
              </div>
              <p style="color: #999; font-size: 12px;">Create Hub Attendance System</p>
            </div>
          `
        )
      }
    }

    if (type === 'completed') {
      const allRecipients = [
        ...assigneeRecipients,
        ...(creatorRecipient ? [creatorRecipient] : [])
      ]
      const unique = Array.from(new Map(allRecipients.map(r => [r.email, r])).values())

      for (const recipient of unique) {
        await sendEmail(
          recipient,
          `Task Completed: ${task.title}`,
          `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #10b981;">Task Marked as Done</h2>
              <p>Hi ${recipient.name},</p>
              <p>The following task has been marked as <strong>Done</strong>.</p>
              <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px;"><strong>Task:</strong> ${task.title}</p>
                ${task.description ? `<p style="margin: 0 0 8px;"><strong>Description:</strong> ${task.description}</p>` : ''}
                <p style="margin: 0;"><strong>Due Date:</strong> ${task.due_date ?? 'No due date'}</p>
              </div>
              <p style="color: #999; font-size: 12px;">Create Hub Attendance System</p>
            </div>
          `
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Task notify error:', err)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}