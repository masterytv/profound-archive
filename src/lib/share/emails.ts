/**
 * Share Your Experience emails. Plain, content-free notices: a story's text
 * is never put in an email; people follow a link and sign in.
 */
import { siteUrl, INTRO_FROM, INVITE_FROM, SHARE_REPLY_TO } from './config';

export function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function layout(title: string, bodyHtml: string): string {
    return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Georgia,'Times New Roman',serif;color:#1e293b">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-family:Arial,sans-serif;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin:0 0 24px">Project Profound</p>
<h1 style="font-size:22px;font-weight:normal;margin:0 0 16px">${escapeHtml(title)}</h1>
${bodyHtml}
<p style="font-family:Arial,sans-serif;font-size:12px;color:#94a3b8;margin-top:32px">Project Profound · projectprofound.org</p>
</div></body></html>`;
}

function button(href: string, label: string, color = '#4f46e5'): string {
    return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-size:15px;padding:12px 20px;border-radius:8px;margin:8px 8px 8px 0">${escapeHtml(label)}</a>`;
}

const p = (s: string) => `<p style="font-size:16px;line-height:1.6;margin:0 0 14px">${s}</p>`;

export interface Email {
    from: string;
    to: string[];
    replyTo?: string;
    subject: string;
    html: string;
    text: string;
}

export function storyReadyEmail(to: string): Email {
    const url = `${siteUrl()}/share/my-stories`;
    return {
        from: INTRO_FROM,
        to: [to],
        replyTo: SHARE_REPLY_TO,
        subject: 'Your story is ready to review',
        html: layout('Your story is ready to review', p('Thank you for sharing your experience. We have turned your recording into text and prepared a few light editing suggestions for you to accept or reject.') + button(url, 'Review my story')),
        text: `Thank you for sharing your experience. Your story is ready to review: ${url}`,
    };
}

export function storyHeldEmail(to: string): Email {
    const url = `${siteUrl()}/share/my-stories`;
    return {
        from: INTRO_FROM,
        to: [to],
        replyTo: SHARE_REPLY_TO,
        subject: 'Your story will appear after a quick check',
        html: layout('Thank you for sharing', p('Your story touches on some very painful moments, so a member of our team will look at it with care before it appears on the site. You don\'t need to do anything.') + p('If you are struggling right now, please reach out: in the US call or text <b>988</b>, in the UK and Ireland call Samaritans on <b>116 123</b>, or find a helpline in your country at <a href="https://findahelpline.com">findahelpline.com</a>.') + button(url, 'My stories')),
        text: `Thank you for sharing. Your story will appear after a quick check by our team. If you are struggling, call or text 988 (US), Samaritans 116 123 (UK/IE), or visit findahelpline.com. ${url}`,
    };
}

export function channelInviteEmail(to: string, token: string, channelNames: string[]): Email {
    const url = `${siteUrl()}/channels/join?token=${encodeURIComponent(token)}`;
    const names = channelNames.map(escapeHtml).join(', ');
    return {
        from: INVITE_FROM,
        to: [to],
        replyTo: SHARE_REPLY_TO,
        subject: 'Your invitation to the Project Profound guest directory',
        html: layout('You\'re invited', p(`As we discussed, here is your access to the Project Profound guest directory${names ? ` for <b>${names}</b>` : ''}. You can browse people who have shared their experiences and asked to be introduced to channels, and request an introduction.`) + button(url, 'Accept the invitation') + p('<span style="font-size:13px;color:#64748b">This link works once, only for this email address, and expires in 7 days.</span>')),
        text: `Your invitation to the Project Profound guest directory: ${url} (works once, for this email address, expires in 7 days).`,
    };
}

export function introRequestEmail(args: { to: string; token: string; channelName: string; note: string }): Email {
    const base = `${siteUrl()}/share/intro/${encodeURIComponent(args.token)}`;
    return {
        from: INTRO_FROM,
        to: [args.to],
        replyTo: SHARE_REPLY_TO,
        subject: `${args.channelName} would like to be introduced to you`,
        html: layout('An introduction request', p(`<b>${escapeHtml(args.channelName)}</b>, a YouTube channel vetted by Project Profound, read your story and would like to be introduced. Their message:`) + `<blockquote style="border-left:3px solid #c7d2fe;margin:0 0 16px;padding:4px 16px;font-style:italic;color:#334155">${escapeHtml(args.note).replace(/\n/g, '<br>')}</blockquote>` + p('If you accept, we send one email to you both with each other\'s contact details, and then step out. If you decline, we tell them politely, without a reason. They never see your contact details unless you accept.') + button(`${base}?choice=accept`, 'Accept the introduction', '#059669') + button(`${base}?choice=decline`, 'No, thank you', '#64748b')),
        text: `${args.channelName} would like to be introduced to you. Their message: "${args.note}". Accept: ${base}?choice=accept  Decline: ${base}?choice=decline`,
    };
}

export function introAcceptedEmail(args: {
    experiencerEmail: string;
    experiencerName: string;
    experiencerExtras: string[];
    memberEmail: string;
    channelName: string;
    storyUrl: string;
}): Email {
    const extras = args.experiencerExtras.length ? `<br>${args.experiencerExtras.map(escapeHtml).join('<br>')}` : '';
    return {
        from: INTRO_FROM,
        to: [args.experiencerEmail, args.memberEmail],
        replyTo: SHARE_REPLY_TO,
        subject: `Introduction: ${args.experiencerName} and ${args.channelName}`,
        html: layout('Meet each other', p(`${escapeHtml(args.experiencerName)} has accepted an introduction to <b>${escapeHtml(args.channelName)}</b>.`) + p(`<b>${escapeHtml(args.experiencerName)}</b>: ${escapeHtml(args.experiencerEmail)}${extras}`) + p(`<b>${escapeHtml(args.channelName)}</b>: ${escapeHtml(args.memberEmail)}`) + p(`The story: <a href="${escapeHtml(args.storyUrl)}">${escapeHtml(args.storyUrl)}</a>`) + p('Project Profound steps out from here. Please take good care of each other.')),
        text: `${args.experiencerName} (${args.experiencerEmail}${args.experiencerExtras.length ? ', ' + args.experiencerExtras.join(', ') : ''}) and ${args.channelName} (${args.memberEmail}). Story: ${args.storyUrl}. Project Profound steps out from here.`,
    };
}

export function introDeclinedEmail(args: { to: string; displayName: string }): Email {
    return {
        from: INTRO_FROM,
        to: [args.to],
        replyTo: SHARE_REPLY_TO,
        subject: 'About your introduction request',
        html: layout('About your introduction request', p(`Thank you for your interest in ${escapeHtml(args.displayName)}'s story. They aren't able to take up an introduction at the moment. Thank you for understanding.`)),
        text: `Thank you for your interest in ${args.displayName}'s story. They aren't able to take up an introduction at the moment.`,
    };
}
