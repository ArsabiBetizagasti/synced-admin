import React from 'react';
import { TEAM_MEMBERS } from '../constants';

const AVATAR_USERS = new Set(['kann', 'jero', 'facu', 'angel']);

export default function UserAvatar({ userId, size = 24, className = '', style = {} }) {
  const sz = typeof size === 'number' ? size : parseInt(size);
  const meta = TEAM_MEMBERS[userId] || { initials: '?', bg: '#444', text: '#fff' };

  if (AVATAR_USERS.has(userId)) {
    return (
      <div
        className={`rounded-full overflow-hidden flex-shrink-0 ${className}`}
        style={{ width: sz, height: sz, ...style }}>
        <img src={`/admin/${userId}-avatar.png`} alt="" className="w-full h-full object-cover" draggable={false} />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold flex-shrink-0 ${className}`}
      style={{ width: sz, height: sz, background: meta.bg, color: meta.text, fontSize: Math.max(Math.round(sz * 0.42), 8), ...style }}>
      {meta.initials}
    </div>
  );
}
