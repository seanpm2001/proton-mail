import { decryptMessageLegacy as realDecryptMessageLegacy, decryptMIMEMessage, SessionKey } from 'pmcrypto';
import { OpenPGPKey } from 'pmcrypto';

import { base64ToArray, arrayToBase64 } from '../base64';
import { Attachment } from '../../models/attachment';
import { generateSessionKey, encryptSessionKey } from './crypto';

export const createDocument = (content: string): Element => {
    const document = window.document.createElement('div');
    document.innerHTML = content;
    return document;
};

export const readSessionKey = (key: any) => {
    return {
        data: base64ToArray(key.Key),
        algorithm: key.Algorithm
    };
};

export const decryptMessageLegacy = async (pack: any, privateKeys: OpenPGPKey[], sessionKey: SessionKey) => {
    const decryptResult = await realDecryptMessageLegacy({
        message: base64ToArray(pack.Body) as any,
        messageDate: new Date(),
        privateKeys: privateKeys,
        sessionKeys: [sessionKey]
    });

    return { data: decryptResult.data };
};

export const decryptMessageMultipart = async (pack: any, privateKeys: OpenPGPKey[], sessionKey: SessionKey) => {
    const decryptResult = await decryptMIMEMessage({
        message: base64ToArray(pack.Body) as any,
        messageDate: new Date(),
        privateKeys: privateKeys,
        sessionKeys: [sessionKey]
    });

    const bodyResult = await decryptResult.getBody();
    const attachments = await decryptResult.getAttachments();

    return { data: bodyResult?.body, mimeType: bodyResult?.mimetype, attachments };
};

export const createAttachment = async (inputAttachment: Partial<Attachment>, publicKeys: OpenPGPKey[]) => {
    const attachment = { ...inputAttachment };

    const sessionKey = await generateSessionKey(publicKeys[0]);
    const encryptedSessionKey = await encryptSessionKey(sessionKey, publicKeys[0]);

    attachment.KeyPackets = arrayToBase64(encryptedSessionKey);

    return { attachment, sessionKey };
};
