import nodemailer from 'nodemailer';
import mails from './mails';

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.in',
  port: 587,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendMail(email: string, name: string, token: string) {
    const mail = mails.waitlist(name, token);

    const response = await transporter.sendMail({
        from: `Memed.fun <${process.env.EMAIL}>`,
        to: [email],
        subject: mail.subject,
        html: mail.html,    
    });
    return response;
}

export default sendMail;