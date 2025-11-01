import React from "react";
import "./AvatarCube.css";

interface AvatarUser {
  id: string | number;
  name: string;
  avatar?: string; // initials or fallback text
  avatarUrl?: string;
  color?: string;
  online?: boolean;
  hasFrame?: boolean;
}

interface AvatarCubeProps {
  avatarUsers: AvatarUser[];
  currentClass: string;
  isRotating: boolean;
}

const AvatarCube: React.FC<AvatarCubeProps> = ({ avatarUsers, currentClass, isRotating }) => {
  return (
    <div className="avatar-scroll-container">
      {avatarUsers.map((user, index) => (
        <div
          key={user.id}
          className={`avatar-card ${user.hasFrame ? "with-frame" : ""}`}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div
            className="avatar-circle"
            style={{
              background: user.avatarUrl
                ? "#d0d0d0"
                : user.color?.startsWith("bg-")
                ? undefined
                : "#c0c0c0",
            }}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="avatar-image" />
            ) : (
              <span className="avatar-text">{user.avatar}</span>
            )}
            {user.online && (
              <div className="online-indicator">
                <div className="w-2.5 h-2.5 rounded-full transition-colors duration-300 bg-green-400" />
              </div>
            )}
          </div>
          <div className="name-tag">
            <span className="name-text">{user.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AvatarCube;