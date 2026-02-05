# PeerChat

**PeerChat** is a serverless, peer-to-peer (P2P) chat and video calling application that runs entirely in the browser. It uses **WebRTC** (via PeerJS) to establish direct connections between users without storing messages or video streams on a central server.

## Features

*   **Serverless Architecture:** All data is transmitted directly between users.
*   **Ephemeral Rooms:** Create a room, share the 4-digit code, and chat. When the host leaves, the room disappears.
*   **Video & Audio Calls:** Integrated Mesh P2P video calling.
*   **Text Chat:** Real-time text messaging with system notifications (join/leave/call status).
*   **No Sign-up Required:** Just generate a random username and jump in.
*   **Secure:** End-to-end encrypted connections (WebRTC standard).

## Tech Stack

*   **Frontend:** React 19, TypeScript, Tailwind CSS
*   **P2P Networking:** PeerJS (WebRTC wrapper)
*   **Build Tool:** Vite
*   **Icons:** Lucide React

## Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/peer-chat.git
    cd peer-chat
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open your browser at `http://localhost:5173`.

## Usage

1.  **Host a Room:** Click "Host a Room" to generate a unique 4-digit code.
2.  **Invite Others:** Share the 4-digit code with your friends.
3.  **Join a Room:** Enter the code on the landing page to connect.
4.  **Chat & Call:** Use the text interface or click "Start Call" to enable video/audio.

## Deployment (GitHub Pages)

This project is configured for automatic deployment to GitHub Pages via GitHub Actions.

1.  Push your code to the `main` branch.
2.  Go to your repository **Settings > Pages**.
3.  Under **Build and deployment**, select **GitHub Actions** as the source.
4.  The action defined in `.github/workflows/deploy.yml` will automatically build and deploy the app.

## Troubleshooting

*   **Video not showing?** Ensure you have granted camera/microphone permissions to the browser.
*   **Connection failed?** PeerJS relies on STUN/TURN servers. If you are behind a strict corporate firewall, P2P connections might be blocked.
*   **"Room not found"?** Ensure the Host is still online. If the Host refreshes or closes the tab, the room is destroyed.

## License

MIT
