import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LeaveNotification {
  recipientEmails: string[];
  notificationType: 'created' | 'approved' | 'rejected' | 'cancelled' | 'partner_approved';
  actionBy: string;
  employeeName: string;
  details: {
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    leaveType: string;
    reason: string;
    status: string;
  };
}

const getEmailSubject = (type: string, employeeName: string, details: any) => {
  switch (type) {
    case 'created':
      return `คำขอลา: ${employeeName} (${details.startDate})`;
    case 'approved':
      return `อนุมัติการลา: ${employeeName} (${details.startDate})`;
    case 'rejected':
      return `ปฏิเสธการลา: ${employeeName} (${details.startDate})`;
    case 'cancelled':
      return `ยกเลิกการลา: ${employeeName} (${details.startDate})`;
    case 'partner_approved':
      return `Partner อนุมัติการลา: ${employeeName} (${details.startDate})`;
    default:
      return `แจ้งเตือนการลา`;
  }
};

const getLeaveTypeText = (type: string) => {
  const types: Record<string, string> = {
    'Annual Leave': 'ลาพักร้อน',
    'Sick Leave': 'ลาป่วย',
    'Personal Leave': 'ลากิจ',
    'CPA Leave': 'ลา CPA'
  };
  return types[type] || type;
};

const getEmailBody = (type: string, actionBy: string, employeeName: string, details: any) => {
  let actionText = '';
  let messageColor = '#2563eb';
  
  switch (type) {
    case 'created':
      actionText = `${employeeName} ส่งคำขอลา`;
      break;
    case 'approved':
      actionText = `${actionBy} อนุมัติการลาของ ${employeeName}`;
      messageColor = '#10b981';
      break;
    case 'rejected':
      actionText = `${actionBy} ปฏิเสธการลาของ ${employeeName}`;
      messageColor = '#ef4444';
      break;
    case 'cancelled':
      actionText = `${actionBy} ยกเลิกการลาของ ${employeeName}`;
      messageColor = '#f59e0b';
      break;
    case 'partner_approved':
      actionText = `${actionBy} (Partner) อนุมัติการลาของ ${employeeName}`;
      messageColor = '#10b981';
      break;
  }

  const isFullDay = !details.startTime || !details.endTime;
  const dateRange = details.startDate === details.endDate 
    ? details.startDate 
    : `${details.startDate} - ${details.endDate}`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: ${messageColor}; margin-bottom: 20px;">${getEmailSubject(type, employeeName, details)}</h2>
      
      <p style="font-size: 16px; line-height: 1.5; color: #374151;">
        ${actionText}
      </p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1f2937; margin-top: 0;">รายละเอียดการลา</h3>
        
        <p><strong>ประเภทการลา:</strong> ${getLeaveTypeText(details.leaveType)}</p>
        <p><strong>วันที่:</strong> ${dateRange}</p>
        ${!isFullDay ? `<p><strong>เวลา:</strong> ${details.startTime} - ${details.endTime}</p>` : '<p><strong>ช่วงเวลา:</strong> เต็มวัน</p>'}
        <p><strong>เหตุผล:</strong> ${details.reason}</p>
        <p><strong>สถานะ:</strong> ${
          details.status === 'approved' ? '✅ อนุมัติ' : 
          details.status === 'rejected' ? '❌ ปฏิเสธ' :
          details.status === 'pending' ? '⏳ รออนุมัติ' : 
          '🚫 ยกเลิก'
        }</p>
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

  try {
    const {
      recipientEmails,
      notificationType,
      actionBy,
      employeeName,
      details,
    }: LeaveNotification = await req.json();

    console.log('Sending leave notification:', {
      recipientEmails,
      notificationType,
      actionBy,
      employeeName,
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

    const emailResponse = await resend.emails.send({
      from: "Leave Management System <onboarding@resend.dev>",
      to: validEmails,
      subject: getEmailSubject(notificationType, employeeName, details),
      html: getEmailBody(notificationType, actionBy, employeeName, details),
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
    console.error("Error in send-leave-notification function:", error);
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
