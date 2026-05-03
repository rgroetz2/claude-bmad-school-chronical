import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { env } from './env';

export const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth:
    env.smtp.user && env.smtp.pass
      ? { user: env.smtp.user, pass: env.smtp.pass }
      : undefined,
});

const templateCache = new Map<string, HandlebarsTemplateDelegate>();

function getTemplate(name: string): HandlebarsTemplateDelegate {
  if (templateCache.has(name)) return templateCache.get(name)!;

  const templatePath = path.resolve(
    process.cwd(),
    'templates',
    `${name}.hbs`,
  );
  const source = fs.readFileSync(templatePath, 'utf8');
  const compiled = Handlebars.compile(source);
  templateCache.set(name, compiled);
  return compiled;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}): Promise<void> {
  const html = getTemplate(options.template)(options.context);
  await transporter.sendMail({
    from: env.smtp.from,
    to: options.to,
    subject: options.subject,
    html,
  });
}
