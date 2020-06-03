import React, { useState, useEffect, ReactNode, MouseEvent } from 'react';
import { useFolders } from 'react-components';
import { buildTreeview } from 'proton-shared/lib/helpers/folder';
import { Folder, FolderWithSubFolders } from 'proton-shared/lib/interfaces/Folder';
import { setItem, getItem } from 'proton-shared/lib/helpers/storage';

import SidebarFolder from './SidebarFolder';

interface Props {
    currentLabelID: string;
    isConversation: boolean;
}

const formatFolderID = (folderID: string): string => `folder_expanded_state_${folderID}`;

const SidebarFolders = ({ currentLabelID, isConversation }: Props) => {
    const [folders, loadingFolders] = useFolders();
    const [foldersUI, setFoldersUI] = useState<Folder[]>([]);

    useEffect(() => {
        if (Array.isArray(folders)) {
            setFoldersUI(
                folders.map((folder) => ({
                    ...folder,
                    Expanded: getItem(formatFolderID(folder.ID)) === '0' ? 0 : 1
                }))
            );
        }
    }, [loadingFolders]);

    const treeview = buildTreeview(foldersUI) as FolderWithSubFolders[];

    const handleToggleFolder = (folder: Folder) => (event: MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();

        const newExpanded = getItem(formatFolderID(folder.ID)) === '0' ? 1 : 0;

        // Update view
        setFoldersUI(
            foldersUI.map((folderItem: Folder) => {
                if (folderItem.ID === folder.ID) {
                    return {
                        ...folderItem,
                        Expanded: newExpanded
                    };
                }
                return folderItem;
            })
        );

        // Save expanded state locally
        setItem(formatFolderID(folder.ID), newExpanded);
    };

    const treeviewReducer = (acc: ReactNode[], folder: FolderWithSubFolders, level = 0): Array<any> => {
        acc.push(
            <SidebarFolder
                key={folder.ID}
                currentLabelID={currentLabelID}
                isConversation={isConversation}
                folder={folder}
                level={level}
                onToggle={handleToggleFolder(folder)}
            />
        );

        if (folder.Expanded && Array.isArray(folder.subfolders) && folder.subfolders.length) {
            folder.subfolders.forEach((folder: FolderWithSubFolders) => treeviewReducer(acc, folder, level + 1));
        }

        return acc;
    };

    return (
        <>{treeview.reduce((acc, folder: FolderWithSubFolders) => treeviewReducer(acc, folder), [] as ReactNode[])}</>
    );
};

export default SidebarFolders;
