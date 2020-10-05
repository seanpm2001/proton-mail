import React from 'react';
import { c } from 'ttag';
import { SmallButton } from 'react-components';
import { ICAL_METHOD } from 'proton-shared/lib/calendar/constants';
import { RequireSome } from 'proton-shared/lib/interfaces/utils';
import { getSequence, InvitationModel } from '../../../../helpers/calendar/invite';
import { WidgetActions } from '../../../../hooks/useWidgetButtons';

interface Props {
    model: RequireSome<InvitationModel, 'invitationIcs'>;
    actions: WidgetActions;
}
const ExtraEventOrganizerButtons = ({ model, actions: { onAccept } }: Props) => {
    const {
        invitationIcs,
        invitationIcs: { method },
        invitationApi
    } = model;
    if (!invitationApi?.vevent.sequence) {
        return null;
    }
    const { vevent: eventIcs } = invitationIcs;
    const { vevent: eventApi } = invitationApi;
    const [sequenceApi, sequenceIcs] = [eventApi, eventIcs].map(getSequence);
    const sequenceDiff = sequenceIcs - sequenceApi;

    if (method === ICAL_METHOD.COUNTER) {
        if (sequenceDiff === 0) {
            return <SmallButton onClick={onAccept}>{c('Action').t`Accept`}</SmallButton>;
        }
        if (sequenceDiff < 0) {
            return <SmallButton disabled={true}>{c('Action').t`Accept`}</SmallButton>;
        }
    }
    return null;
};

export default ExtraEventOrganizerButtons;
