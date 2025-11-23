import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AssignmentNotification {
  recipientEmails: string[];
  notificationType: 'created' | 'updated' | 'cancelled' | 'approved' | 'partner_approved';
  actionBy: string;
  details: {
    date: string;
    startTime: string;
    endTime: string;
    clientName?: string;
    activityName?: string;
    jobType?: string;
    employeeNames: string[];
    status: string;
  };
}

const getEmailSubject = (type: string, details: any) => {
  switch (type) {
    case 'created':
      return `งานใหม่: ${details.clientName || details.activityName} (${details.date})`;
    case 'updated':
      return `แก้ไขงาน: ${details.clientName || details.activityName} (${details.date})`;
    case 'cancelled':
      return `ยกเลิกงาน: ${details.clientName || details.activityName} (${details.date})`;
    case 'approved':
      return `อนุมัติงาน: ${details.clientName || details.activityName} (${details.date})`;
    case 'partner_approved':
      return `Partner อนุมัติงาน: ${details.clientName || details.activityName} (${details.date})`;
    default:
      return `แจ้งเตือนการมอบหมายงาน`;
  }
};

const getEmailBody = (type: string, actionBy: string, details: any) => {
  const employeeList = details.employeeNames.join(', ');
  
  let actionText = '';
  switch (type) {
    case 'created':
      actionText = 'มอบหมายงานใหม่ให้คุณ';
      break;
    case 'updated':
      actionText = 'แก้ไขรายละเอียดงานของคุณ';
      break;
    case 'cancelled':
      actionText = 'ยกเลิกงานของคุณ';
      break;
    case 'approved':
      actionText = 'อนุมัติงานของคุณ';
      break;
    case 'partner_approved':
      actionText = 'อนุมัติงานของคุณ (Partner)';
      break;
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">${getEmailSubject(type, details)}</h2>
      
      <p style="font-size: 16px; line-height: 1.5; color: #374151;">
        <strong>${actionBy}</strong> ${actionText}
      </p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1f2937; margin-top: 0;">รายละเอียดงาน</h3>
        
        ${details.clientName ? `<p><strong>ลูกค้า:</strong> ${details.clientName}</p>` : ''}
        ${details.activityName ? `<p><strong>กิจกรรม:</strong> ${details.activityName}</p>` : ''}
        ${details.jobType ? `<p><strong>ประเภทงาน:</strong> ${details.jobType}</p>` : ''}
        <p><strong>วันที่:</strong> ${details.date}</p>
        <p><strong>เวลา:</strong> ${details.startTime} - ${details.endTime}</p>
        <p><strong>พนักงาน:</strong> ${employeeList}</p>
        <p><strong>สถานะ:</strong> ${details.status === 'approved' ? 'อนุมัติ' : details.status === 'pending' ? 'รออนุมัติ' : 'ยกเลิก'}</p>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
        อีเมลนี้ส่งโดยอัตโนมัติจากระบบจัดการงาน กรุณาอย่าตอบกลับอีเมลนี้
      </p>
    </div>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Edge function called - method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  try {
    const {
      recipientEmails,
      notificationType,
      actionBy,
      details,
    }: AssignmentNotification = await req.json();

    console.log('Sending assignment notification:', {
      recipientEmails,
      notificationType,
      actionBy,
      details,
    });

    if (!recipientEmails || recipientEmails.length === 0) {
      console.log('No recipient emails provided');
      return new Response(
        JSON.stringify({ success: true, message: 'No recipients' }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('Recipient emails:', recipientEmails);

    // Filter out empty emails
    const validEmails = recipientEmails.filter(email => email && email.trim());
    
    if (validEmails.length === 0) {
      console.log('No valid emails after filtering');
      return new Response(
        JSON.stringify({ success: true, message: 'No valid emails' }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('About to send email with Resend...');
    console.log('Valid emails:', validEmails);
    console.log('Subject:', getEmailSubject(notificationType, details));

    const emailResponse = await resend.emails.send({
      from: "Assignment System <onboarding@resend.dev>",
      to: validEmails,
      subject: getEmailSubject(notificationType, details),
      html: getEmailBody(notificationType, actionBy, details),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-assignment-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
