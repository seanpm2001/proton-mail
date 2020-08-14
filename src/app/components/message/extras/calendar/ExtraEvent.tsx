import React, { useEffect, useState } from 'react';
import {
    Icon,
    InlineLinkButton,
    Loader,
    useApi,
    useGetCalendarEventRaw,
    useGetCalendarIdsAndKeys,
    useLoading
} from 'react-components';
import { c } from 'ttag';
import { ICAL_METHOD } from 'proton-shared/lib/calendar/constants';
import { getDisplayTitle } from 'proton-shared/lib/calendar/helper';
import { Calendar } from 'proton-shared/lib/interfaces/calendar';
import { ContactEmail } from 'proton-shared/lib/interfaces/contacts';
import { Address } from 'proton-shared/lib/interfaces';
import {
    EVENT_INVITATION_ERROR_TYPE,
    EventInvitationError,
    getErrorMessage
} from '../../../../helpers/calendar/EventInvitationError';
import {
    EventInvitationRaw,
    fetchEventInvitation,
    getHasInvitation,
    getInitialInvitationModel,
    getInvitationHasEventID,
    InvitationModel,
    updateEventInvitation
} from '../../../../helpers/calendar/invite';

import { MessageExtended } from '../../../../models/message';
// import ExtraEventButtons from './ExtraEventButtons';
import ExtraEventDetails from './ExtraEventDetails';
import ExtraEventSummary from './ExtraEventSummary';

interface Props {
    message: MessageExtended;
    invitationOrError: EventInvitationRaw | EventInvitationError;
    calendars: Calendar[];
    defaultCalendar?: Calendar;
    contactEmails: ContactEmail[];
    ownAddresses: Address[];
}
const ExtraEvent = ({ invitationOrError, message, calendars, defaultCalendar, contactEmails, ownAddresses }: Props) => {
    const [model, setModel] = useState<InvitationModel>(() =>
        getInitialInvitationModel(invitationOrError, message, contactEmails, ownAddresses, defaultCalendar)
    );
    const [loading, withLoading] = useLoading(true);
    const [retryCount, setRetryCount] = useState<number>(0);
    const api = useApi();
    const getCalendarEventRaw = useGetCalendarEventRaw();
    const getIdsAndKeys = useGetCalendarIdsAndKeys();

    const handleRetry = () => {
        setRetryCount((count) => count + 1);
        setModel(getInitialInvitationModel(invitationOrError, message, contactEmails, ownAddresses, defaultCalendar));
        return;
    };

    const { method, isOrganizerMode, invitationIcs } = model;
    const title = getDisplayTitle(invitationIcs?.vevent.summary?.value);

    useEffect(() => {
        const run = async () => {
            if (!invitationIcs?.vevent) {
                return;
            }
            let invitationApi;
            let calendar;
            try {
                const { invitation, calendar: calendarApi } = await fetchEventInvitation({
                    veventComponent: invitationIcs.vevent,
                    api,
                    getCalendarEventRaw,
                    calendars,
                    message,
                    contactEmails,
                    ownAddresses
                });
                invitationApi = invitation;
                calendar = calendarApi;
            } catch (error) {
                // if fetching fails, proceed as if there was no event in the database
                return;
            }
            if (!getInvitationHasEventID(invitationApi) || !calendar) {
                return;
            }
            const { memberID, addressKeys, calendarKeys } = await getIdsAndKeys(calendar.ID);
            try {
                const updatedInvitationApi = await updateEventInvitation({
                    method,
                    isOrganizerMode,
                    invitationIcs,
                    invitationApi,
                    api,
                    calendar,
                    memberID,
                    addressKeys,
                    calendarKeys,
                    message,
                    contactEmails,
                    ownAddresses
                });
                setModel({
                    ...model,
                    invitationApi: updatedInvitationApi ? updatedInvitationApi : invitationApi
                });
            } catch (e) {
                setModel({
                    ...model,
                    invitationApi,
                    calendar,
                    error: new EventInvitationError(EVENT_INVITATION_ERROR_TYPE.UPDATING_ERROR)
                });
            }
        };
        withLoading(run());
    }, [retryCount]);

    if (loading) {
        return (
            <div className="rounded bordered bg-white-dm mb1 pl1 pr1 pt0-5 pb0-5">
                <Loader />
            </div>
        );
    }

    if (model.error) {
        const message = getErrorMessage(model.error.type);
        return (
            <div className="bg-global-warning color-white rounded p0-5 mb0-5 flex flex-nowrap">
                <Icon name="attention" className="flex-item-noshrink mtauto mbauto" />
                <span className="pl0-5 pr0-5 flex-item-fluid">{message}</span>
                <span className="flex-item-noshrink flex">
                    <InlineLinkButton onClick={handleRetry} className="underline color-currentColor">
                        {c('Action').t`Try again`}
                    </InlineLinkButton>
                </span>
            </div>
        );
    }

    if ((isOrganizerMode && method === ICAL_METHOD.REFRESH) || !getHasInvitation(model)) {
        return null;
    }

    return (
        <div className="rounded bordered bg-white-dm mb1 pl1 pr1 pt0-5 pb0-5">
            <header className="flex flex-nowrap flex-items-center">
                <Icon name="calendar" className="mr0-5 flex-item-noshrink" />
                <strong className="ellipsis flex-item-fluid" title={title}>
                    {title}
                </strong>
            </header>
            <ExtraEventSummary model={model} />
            {/*<ExtraEventButtons model={model} />*/}
            <div className="border-bottom mb0-5"></div>
            <ExtraEventDetails model={model} defaultCalendar={defaultCalendar} />
        </div>
    );
};

export default ExtraEvent;
