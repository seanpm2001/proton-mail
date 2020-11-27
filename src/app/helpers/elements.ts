import { Location } from 'history';
import { formatRelative, format } from 'date-fns';
import { toMap, omit } from 'proton-shared/lib/helpers/object';
import { Label, LabelCount } from 'proton-shared/lib/interfaces/Label';
import { diff, unique } from 'proton-shared/lib/helpers/array';
import { MAILBOX_LABEL_IDS } from 'proton-shared/lib/constants';
import { MailSettings } from 'proton-shared/lib/interfaces';
import { Message } from 'proton-shared/lib/interfaces/mail/Message';
import { hasAttachments as messageHasAttachments } from 'proton-shared/lib/mail/messages';
import { Folder } from 'proton-shared/lib/interfaces/Folder';
import { ELEMENT_TYPES } from '../constants';
import { Element } from '../models/element';
import { Sort, SearchParameters, Filter } from '../models/tools';
import { isConversationMode } from './mailSettings';
import {
    isUnread as conversationIsUnread,
    hasAttachments as conversationHasAttachments,
    getNumAttachments as conversationNumAttachments,
    getLabelIDs as conversationGetLabelIDs,
    getTime as conversationGetTime,
} from './conversation';
import { LabelIDsChanges } from '../models/event';
import { Conversation } from '../models/conversation';

const { INBOX, TRASH, SPAM, ARCHIVE } = MAILBOX_LABEL_IDS;

export interface TypeParams {
    labelID?: string;
    mailSettings?: any;
    location: Location;
}

export const getCurrentType = ({ labelID, mailSettings, location }: TypeParams) =>
    isConversationMode(labelID, mailSettings, location) ? ELEMENT_TYPES.CONVERSATION : ELEMENT_TYPES.MESSAGE;

export const isMessage = (element: Element = {}): boolean => typeof (element as Message).ConversationID === 'string';
export const isConversation = (element: Element = {}): boolean => !isMessage(element);

/**
 * Get the date of an element.
 * @param element
 * @param labelID is only used for a conversation. Yet mandatory not to forget to consider its use.
 */
export const getDate = (element: Element | undefined, labelID: string | undefined) => {
    if (!element) {
        return new Date();
    }

    const time = isMessage(element) ? element.Time : conversationGetTime(element, labelID);

    return new Date((time || 0) * 1000);
};

/**
 * Get readable time to display from message / conversation
 * @param element.Time
 * @return Jan 17, 2016
 */
export const getReadableTime = (element: Element | undefined, labelID: string | undefined) =>
    formatRelative(getDate(element, labelID), new Date());

export const getReadableFullTime = (element: Element | undefined, labelID: string | undefined) =>
    format(getDate(element, labelID), 'Ppp');

/**
 * Return if the element is to be considered in read or unread status
 * @param element
 * @param labelID is only used for a conversation. Yet mandatory not to forget to consider its use.
 */
export const isUnread = (element: Element | undefined, labelID: string | undefined) => {
    if (!element) {
        return false;
    }

    if (isMessage(element)) {
        return (element as Message).Unread !== 0;
    }

    return conversationIsUnread(element as Conversation, labelID);
};

export const isUnreadMessage = (message: Message) => isUnread(message, undefined);

export const getLabelIDs = (element: Element | undefined, contextLabelID: string | undefined) =>
    isMessage(element)
        ? (element as Message | undefined)?.LabelIDs?.reduce<{ [labelID: string]: boolean | undefined }>(
              (acc, labelID) => {
                  acc[labelID] = true;
                  return acc;
              },
              {}
          ) || {}
        : conversationGetLabelIDs(element, contextLabelID);

export const hasLabel = (element: Element | undefined, labelID: string) =>
    getLabelIDs(element, undefined)[labelID] !== undefined;

export const isStarred = (element: Element) => hasLabel(element, MAILBOX_LABEL_IDS.STARRED);

export const getSize = ({ Size = 0 }: Element) => Size;

export const sort = (elements: Element[], sort: Sort, labelID: string) => {
    const getValue = {
        Time: (element: Element, labelID: string) => getDate(element, labelID).getTime(),
        Size: getSize,
    }[sort.sort] as any;
    const compare = (a: Element, b: Element) => {
        const valueA = getValue(a, labelID);
        const valueB = getValue(b, labelID);
        if (valueA === valueB) {
            return (a.Order || 0) - (b.Order || 0);
        }
        return sort.desc ? valueB - valueA : valueA - valueB;
    };
    return [...elements].sort((e1, e2) => compare(e1, e2));
};

export const getCounterMap = (
    labels: Label[],
    conversationCounters: LabelCount[],
    messageCounters: LabelCount[],
    mailSettings: MailSettings,
    location: Location
) => {
    const labelIDs = [...Object.values(MAILBOX_LABEL_IDS), ...labels.map((label) => label.ID || '')];
    const conversationCountersMap = toMap(conversationCounters, 'LabelID') as { [labelID: string]: LabelCount };
    const messageCountersMap = toMap(messageCounters, 'LabelID') as { [labelID: string]: LabelCount };

    return labelIDs.reduce<{ [labelID: string]: LabelCount | undefined }>((acc, labelID) => {
        const conversationMode = isConversationMode(labelID, mailSettings, location);
        const countersMap = conversationMode ? conversationCountersMap : messageCountersMap;
        acc[labelID] = countersMap[labelID];
        return acc;
    }, {});
};

export const hasAttachments = (element: Element, labelID: string | undefined) =>
    isMessage(element) ? messageHasAttachments(element as Message) : conversationHasAttachments(element, labelID);

export const getNumAttachments = (element: Element, labelID: string | undefined) =>
    isMessage(element) ? (element as Message)?.NumAttachments || 0 : conversationNumAttachments(element, labelID);

/**
 * Starting from the element LabelIDs list, add and remove labels from an event manager event
 */
export const parseLabelIDsInEvent = <T extends Element>(element: T, changes: T & LabelIDsChanges): T => {
    if (isMessage(element)) {
        const LabelIDs = unique(
            diff((element as Message).LabelIDs || [], changes.LabelIDsRemoved || []).concat(changes.LabelIDsAdded || [])
        );
        return { ...element, ...omit(changes, ['LabelIDsRemoved', 'LabelIDsAdded']), LabelIDs };
    }
    // Conversation don't use LabelIDs even if these properties are still present in update events
    // The conversation.Labels object is fully updated each time so we can safely ignore them
    return { ...element, ...omit(changes, ['LabelIDsRemoved', 'LabelIDsAdded']) };
};

export const isSearch = (searchParams: SearchParameters) =>
    !!searchParams.address ||
    !!searchParams.attachments ||
    !!searchParams.begin ||
    !!searchParams.end ||
    !!searchParams.from ||
    !!searchParams.keyword ||
    !!searchParams.to ||
    !!searchParams.wildcard;

export const isFilter = (filter: Filter) => Object.keys(filter).length > 0;

/**
 * Get the ID of the folder where the element is currently located
 */
export const getCurrentFolderID = (element: Element | undefined, customFoldersList: Folder[]): string => {
    const labelIDs = getLabelIDs(element, undefined);
    const standardFolders: { [labelID: string]: boolean } = {
        [INBOX]: true,
        [TRASH]: true,
        [SPAM]: true,
        [ARCHIVE]: true,
    };
    const customFolders = toMap(customFoldersList, 'ID');
    return Object.keys(labelIDs).find((labelID) => standardFolders[labelID] || customFolders[labelID]) || '';
};
