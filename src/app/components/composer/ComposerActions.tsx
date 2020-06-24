import React, { MutableRefObject } from 'react';
import { c } from 'ttag';
import { Button, useModals, ConfirmModal, Alert, classnames, Tooltip, Icon } from 'react-components';
import { noop } from 'proton-shared/lib/helpers/function';

import { formatSimpleDate } from '../../helpers/date';
import { MessageExtended } from '../../models/message';

import AttachmentsButton from './attachments/AttachmentsButton';
import { hasFlag, getAttachments, getRecipients } from '../../helpers/message/messages';
import { MESSAGE_FLAGS } from '../../constants';

interface Props {
    className?: string;
    message: MessageExtended;
    date: Date;
    lock: boolean;
    sending: boolean;
    syncInProgress: boolean;
    syncStatus: string;
    onAddAttachments: (files: File[]) => void;
    onPassword: () => void;
    onExpiration: () => void;
    onSave: () => Promise<void>;
    onSend: () => Promise<void>;
    onDelete: () => Promise<void>;
    addressesBlurRef: MutableRefObject<() => void>;
}

const ComposerActions = ({
    className,
    message,
    date,
    lock,
    sending,
    syncInProgress,
    syncStatus,
    onAddAttachments,
    onPassword,
    onExpiration,
    onSave,
    onSend,
    onDelete,
    addressesBlurRef
}: Props) => {
    const { createModal } = useModals();

    const handleDelete = () => {
        return createModal(
            <ConfirmModal onConfirm={onDelete} onClose={noop} title={c('Title').t`Delete`}>
                <Alert type="warning">{c('Info').t`Are you sure you want to permanently delete this draft?`}</Alert>
            </ConfirmModal>
        );
    };

    const isAttachments = getAttachments(message.data).length > 0;
    const isPassword = hasFlag(MESSAGE_FLAGS.FLAG_INTERNAL)(message.data) && message.data?.Password;
    const isExpiration = !!message.expiresIn;
    const hasRecipients = getRecipients(message.data).length > 0;

    let dateMessage = '';
    if (syncInProgress) {
        dateMessage = c('Action').t`Saving...`;
    } else {
        if (date.getTime() !== 0) {
            const dateString = formatSimpleDate(date);
            dateMessage = c('Info').t`Saved on ${dateString}`;
        } else {
            dateMessage = c('Action').t`Not saved`;
        }
    }

    let buttonSendLabel = c('Action').t`Send`;
    if (sending) {
        buttonSendLabel = syncStatus;
    }

    return (
        <footer
            className={classnames(['composer-actions flex-item-noshrink flex flex-row pl1 pr1', className])}
            onClick={addressesBlurRef.current}
        >
            <div className="flex mb0-5">
                <Tooltip title={c('Action').t`Attachments`} className="flex">
                    <AttachmentsButton
                        className={classnames([isAttachments && 'pm-button-blueborder'])}
                        disabled={lock}
                        onAddAttachments={onAddAttachments}
                    />
                </Tooltip>
                <Tooltip title={c('Action').t`Expiration time`} className="flex ml0-5">
                    <Button
                        icon="expiration"
                        className={classnames([
                            'inline-flex flex-items-center pm-button--for-icon',
                            isExpiration && 'pm-button-blueborder'
                        ])}
                        onClick={onExpiration}
                        disabled={lock}
                    >
                        <span className="sr-only">{c('Action').t`Expiration time`}</span>
                    </Button>
                </Tooltip>
                <Tooltip title={c('Action').t`Encryption`} className="flex ml0-5">
                    <Button
                        icon="lock-alone"
                        className={classnames([
                            'inline-flex flex-items-center pm-button--for-icon',
                            isPassword && 'pm-button-blueborder'
                        ])}
                        onClick={onPassword}
                        disabled={lock}
                    >
                        <span className="sr-only">{c('Action').t`Encryption`}</span>
                    </Button>
                </Tooltip>
            </div>
            <div className="flex flex-self-vcenter mlauto mb0-5">
                <span className="mr0-5 mtauto mbauto nomobile">{dateMessage}</span>
                <Tooltip title={c('Action').t`Delete draft`} className="flex mr0-5">
                    <Button
                        className="inline-flex flex-items-center pm-button--for-icon"
                        icon="trash"
                        disabled={lock}
                        onClick={handleDelete}
                    >
                        <span className="sr-only">{c('Action').t`Delete draft`}</span>
                    </Button>
                </Tooltip>
                <Tooltip title={c('Action').t`Save`} className="flex mr0-5">
                    <Button
                        className="inline-flex flex-items-center pm-button--for-icon"
                        icon="save"
                        disabled={lock}
                        onClick={() => onSave()}
                    >
                        <span className="sr-only">{c('Action').t`Save`}</span>
                    </Button>
                </Tooltip>
                <Button
                    className="pm-button--primary composer-send-button"
                    disabled={!hasRecipients}
                    loading={lock}
                    onClick={onSend}
                >
                    <Icon name="sent" className="nodesktop notablet onmobile-flex"></Icon>
                    <span className="pl1 pr1 nomobile">{buttonSendLabel}</span>
                </Button>
            </div>
        </footer>
    );
};

export default ComposerActions;
