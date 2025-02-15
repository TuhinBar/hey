import type { Profile } from '@hey/lens';
import { Spinner } from '@hey/ui';
import { t } from '@lingui/macro';
import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useXmtpClient from 'src/hooks/useXmtpClient';
import {
  useAttachmentCachePersistStore,
  useAttachmentStore
} from 'src/store/attachment';
import type {
  Attachment as TAttachment,
  RemoteAttachment
} from 'xmtp-content-type-remote-attachment';
import { RemoteAttachmentCodec } from 'xmtp-content-type-remote-attachment';

import Attachment from './AttachmentView';

interface RemoteAttachmentPreviewProps {
  remoteAttachment: RemoteAttachment;
  profile: Profile | undefined;
  sentByMe: boolean;
  preview?: ReactNode;
}

enum Status {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded'
}

const RemoteAttachmentPreview: FC<RemoteAttachmentPreviewProps> = ({
  remoteAttachment,
  profile,
  sentByMe,
  preview
}) => {
  const [status, setStatus] = useState<Status>(Status.UNLOADED);
  const [attachment, setAttachment] = useState<TAttachment | null>(null);
  const { client } = useXmtpClient(true);
  const loadedAttachmentURLs = useAttachmentStore(
    (state) => state.loadedAttachmentURLs
  );
  const addLoadedAttachmentURL = useAttachmentStore(
    (state) => state.addLoadedAttachmentURL
  );
  const cachedAttachments = useAttachmentCachePersistStore(
    (state) => state.cachedAttachments
  );
  const cacheAttachment = useAttachmentCachePersistStore(
    (state) => state.cacheAttachment
  );

  const redactionReason = useMemo<string | null>(() => {
    const cached = cachedAttachments.get(remoteAttachment.url);

    // We've already got it, no need to show loading
    if (cached) {
      return null;
    }

    if (profile && !profile.isFollowedByMe && !sentByMe) {
      return t`Attachments are not loaded automatically from people you don’t follow.`;
    }

    // if it's bigger than 100 megabytes
    if (remoteAttachment.contentLength > 104857600 && !sentByMe) {
      return t`Large attachments are not loaded automatically.`;
    }

    return null;
  }, [profile, sentByMe, cachedAttachments, remoteAttachment]);

  const load = useCallback(
    async function () {
      const cachedAttachment = cachedAttachments.get(remoteAttachment.url);

      if (cachedAttachment) {
        setAttachment(cachedAttachment);
        setStatus(Status.LOADED);
        return;
      }

      setStatus(Status.LOADING);

      if (!client) {
        return;
      }

      const attachment: TAttachment = await RemoteAttachmentCodec.load(
        remoteAttachment,
        client
      );

      setAttachment(attachment);
      setStatus(Status.LOADED);

      cacheAttachment(remoteAttachment.url, attachment);
      addLoadedAttachmentURL(remoteAttachment.url);
    },
    [
      client,
      remoteAttachment,
      addLoadedAttachmentURL,
      cachedAttachments,
      cacheAttachment
    ]
  );

  useEffect(() => {
    async function loadInitial() {
      if (!redactionReason) {
        await load();
      }
    }

    loadInitial();
  }, [
    load,
    client,
    remoteAttachment,
    loadedAttachmentURLs,
    profile,
    cachedAttachments,
    redactionReason
  ]);

  // if preview exists, always use it. this should prevent any rendering
  // quirks that may result when switching from the local preview to the
  // remote preview
  if (preview) {
    return preview;
  }

  return (
    <div className="mt-1 space-y-1">
      {attachment ? <Attachment attachment={attachment} /> : null}
      {status === Status.LOADING ? (
        <Spinner className="mx-28 my-5" size="sm" />
      ) : null}
      {status === Status.UNLOADED ? (
        <div className="space-y-2 text-sm">
          <p className="text-gray-500">{redactionReason}</p>
          <button
            className="text-brand-700 inline-block text-xs"
            onClick={load}
          >
            View
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default RemoteAttachmentPreview;
