Feature: PeerChat – Serverless P2P Chat

  Background:
    Given the PeerChat application is running at "http://localhost:5174"

  # ──────────────────────────────────────────────
  # LANDING PAGE
  # ──────────────────────────────────────────────

  Scenario: Landing page renders correctly
    Then I see the "PeerChat" heading
    And I see the tagline "Serverless, private, ephemeral."
    And I see a "Join a Room" section with a 4-digit code input
    And I see a "Host a Room" section with an arrow button
    And the "Join Room" button is disabled
    And I see the footer "Powered by PeerJS • End-to-End Client Side"

  Scenario: Join button enables only when 4 characters are typed
    When I type "12" in the room code input
    Then the "Join Room" button is disabled
    When I type "1234" in the room code input
    Then the "Join Room" button is enabled

  Scenario: Input enforces maximum length of 4 characters
    When I type "12345" in the room code input
    Then the input value is "1234"
    And the "Join Room" button is enabled

  # ──────────────────────────────────────────────
  # HOST FLOW
  # ──────────────────────────────────────────────

  Scenario: Host creates a room and receives a room code
    When I click "Host a Room"
    Then I am taken to the chat room view
    And I see a 4-digit room code in the sidebar
    And I see "1 ACTIVE USERS" in the header
    And my username is listed with "(You)" label in the sidebar
    And I see a "Start Call" button
    And I see the footer "End-to-End Encrypted P2P Connection"

  Scenario: Host leaves the room and returns to the landing page
    Given I am the host of a room
    When I click "Leave Room"
    Then I am returned to the landing page
    And I see the "PeerChat" heading

  Scenario: Host renames the room and the change propagates to the guest
    Given a host and a guest are connected in the same room
    When the host clicks the room name edit icon in the sidebar
    And the host clears the field and types "Sala de Testes E2E"
    And the host presses Enter
    Then the host sees "Sala de Testes E2E" as the room name in the sidebar and header
    And the guest also sees "Sala de Testes E2E" as the room name in real-time

  Scenario: Host cannot join another room while already hosting
    Given I am the host of a room
    Then there is no room code input visible on the screen

  # ──────────────────────────────────────────────
  # GUEST FLOW
  # ──────────────────────────────────────────────

  Scenario: Guest joins an existing room with a valid code
    Given a host has created a room with code "8414"
    And I am on the landing page as a guest
    When I type "8414" in the room code input
    And I click "Join Room"
    Then I am taken to the chat room view
    And I see "2 ACTIVE USERS" in the header
    And I see a system message containing "JOINED THE ROOM"
    And both the host and I are listed in the sidebar

  Scenario: Guest sees updated user count after joining
    Given a host has created a room
    When a guest joins the room
    Then the host sees "2 ACTIVE USERS"
    And the guest sees "2 ACTIVE USERS"

  Scenario: Guest leaves the room and the host is notified
    Given a host and a guest are connected in the same room
    When the guest clicks "Leave Room"
    Then the guest is returned to the landing page
    And the host sees a system message containing "LEFT THE ROOM"
    And the host sees "1 ACTIVE USERS"

  Scenario: Joining with a non-existent room code shows an error
    Given I am on the landing page
    When I type "9999" in the room code input
    And I click "Join Room"
    Then I see the error banner "Room not found or host disconnected."

  # ──────────────────────────────────────────────
  # MESSAGING
  # ──────────────────────────────────────────────

  Scenario: Host sends a message and guest receives it
    Given a host and a guest are connected in the same room
    When the host types "Olá do host!" in the message input and presses Enter
    Then the guest sees "Olá do host!" in the chat
    And the host sees "Olá do host!" in the chat with self-alignment

  Scenario: Guest sends a message and host receives it
    Given a host and a guest are connected in the same room
    When the guest types "Olá do guest! 🚀" in the message input and presses Enter
    Then the host sees "Olá do guest! 🚀" in the chat
    And the guest sees "Olá do guest! 🚀" in the chat with self-alignment

  Scenario: Whitespace-only messages are not sent
    Given I am in a room
    When I type "   " in the message input and press Enter
    Then the send handler is not called
    And no new message appears in the chat

  Scenario: Empty messages state shows placeholder
    Given I am in a room with no messages
    Then I see "No messages yet. Start the conversation!"

  # ──────────────────────────────────────────────
  # USER RENAME
  # ──────────────────────────────────────────────

  Scenario: User renames themselves and the host sees the updated name
    Given a host and a guest are connected in the same room
    When the guest clicks the edit icon next to their name in the sidebar
    And the guest types "GstRenome" and presses Enter
    Then the guest sidebar shows "GstRenome (You)"
    And the host sidebar shows "GstRenome" for that user

  Scenario: Editing name is cancelled when Escape is pressed
    Given I am in a room
    When I click the edit icon next to my name
    And I type "DraftName" in the name input
    And I press Escape
    Then my original name is still displayed
    And the rename callback is not called

  Scenario: Name is saved when the check button is clicked
    Given I am in a room
    When I click the edit icon next to my name
    And I type "SavedName" in the name input
    And I click the confirm button
    Then the rename callback is called with "SavedName"

  # ──────────────────────────────────────────────
  # CALL CONTROLS
  # ──────────────────────────────────────────────

  Scenario: Starting a call shows the call controls bar
    Given I am the host of a room
    When I click "Start Call"
    Then I see a system message "* STARTED A CALL"
    And I see the mute button in the call controls bar
    And I see the camera toggle button in the call controls bar
    And I see the end-call (PhoneOff) button in the call controls bar
    And I see a video tile with "Camera Off" text (no real camera in test environment)

  Scenario: Muting marks the user as muted in the sidebar
    Given I am in an active call
    When I click the mute button
    Then the mute icon appears next to my name in the sidebar
    And the mute button appears highlighted (active state)

  Scenario: Ending a call returns to the pre-call state
    Given I am in an active call
    When I click the end-call button
    Then the video grid is hidden
    And the "Start Call" button is visible again

  Scenario: Guest that did not start the call joins the call when toggling
    Given a host has started a call
    When the guest clicks "Start Call"
    Then the guest sees their own video tile
    And the system message "* STARTED A CALL" appears for the guest

  # ──────────────────────────────────────────────
  # ERROR HANDLING
  # ──────────────────────────────────────────────

  Scenario: Error banner can be dismissed with the X button
    Given I am in a room with an active error "Something went wrong"
    When I click the X button on the error banner
    Then the error banner disappears
    And the clear error callback is called

  Scenario: No error banner is shown when error is null
    Given I am in a room with no error
    Then no error banner is visible

  # ──────────────────────────────────────────────
  # MULTI-USUÁRIO (3+ PEERS)
  # ──────────────────────────────────────────────

  @multi-user @slow
  Scenario: Third guest joins a room with two existing participants
    Given a host and a guest are connected in the same room
    When a second guest joins the room
    Then all three participants see "3 ACTIVE USERS" in the header
    And all three participants are listed in the sidebar

  @multi-user @slow
  Scenario: Guest message is relayed by host to all other guests
    Given a host and two guests are connected in the same room
    When the first guest types "hi everyone" in the message input and presses Enter
    Then the second guest also sees "hi everyone" in the chat

  @multi-user @slow
  Scenario: One guest leaves a multi-user room and the others are notified
    Given a host and two guests are connected in the same room
    When the first guest clicks "Leave Room"
    Then the host sees "2 ACTIVE USERS" in the header
    And the host sees a system message containing "LEFT THE ROOM"

  @multi-user @slow
  Scenario: Late joiner receives full room state including renamed room
    Given a host and a guest are connected in the same room
    And the host has renamed the room to "Project Sync"
    When a second guest joins the room
    Then the second guest sees the room name as "Project Sync"

  # ──────────────────────────────────────────────
  # PERMISSÕES E FALHAS DE HARDWARE DE MÍDIA
  # ──────────────────────────────────────────────

  @media-permissions
  Scenario: Starting a call when microphone permission is denied shows an error
    Given I am the host of a room
    And the browser has denied media access
    When I click "Start Call"
    Then I see the error banner "Could not access camera/mic."
    And the call controls bar is not shown

  @media-permissions
  Scenario: Camera hardware failure during an active call shows an error
    Given I am in an active call
    When the camera hardware disconnects
    Then I see the error banner "Failed to access camera"

  # ──────────────────────────────────────────────
  # VÍDEO – COMPORTAMENTO DO TILE
  # ──────────────────────────────────────────────

  @video
  Scenario: Video tile shows "Camera Off" placeholder when video is disabled
    Given I am in an active call
    Then I see a video tile with "Camera Off" text

  @video @slow
  Scenario: Remote user's video tile disappears when they end the call
    Given a host and a guest are in an active call
    When the guest ends the call
    Then the guest's video tile is removed from the host's video grid

  # ──────────────────────────────────────────────
  # DESCONEXÃO INESPERADA / FECHAMENTO DE ABA
  # ──────────────────────────────────────────────

  @disconnection @slow
  Scenario: Host closes the browser tab abruptly
    Given a host and a guest are connected in the same room
    When the host closes the browser tab abruptly
    Then the guest sees the error "Disconnected from host."

  @disconnection @slow
  Scenario: Guest abruptly closes the browser tab
    Given a host and a guest are connected in the same room
    When the guest closes the browser tab abruptly
    Then the host sees a system message containing "LEFT THE ROOM"
    And the host sees "1 ACTIVE USERS" in the header

  @disconnection @slow
  Scenario: Page refresh mid-session returns user to landing page
    Given a host and a guest are connected in the same room
    When the guest refreshes the browser tab
    Then the guest sees the "PeerChat" heading
    And the host sees a system message containing "LEFT THE ROOM"

  # ──────────────────────────────────────────────
  # RACE CONDITIONS E ESTADO
  # ──────────────────────────────────────────────

  @race-condition
  Scenario: Rapid toggle of mute button does not desync UI from actual state
    Given I am in an active call
    When I click the mute button 5 times rapidly
    Then the final mute state is consistent between UI and audio track

  @race-condition
  Scenario: Double-clicking "Start Call" does not create duplicate media connections
    Given I am the host of a room
    When I double-click "Start Call"
    Then only one video tile for myself appears
    And the call controls bar is visible

  # ──────────────────────────────────────────────
  # GUEST NÃO PODE RENOMEAR SALA
  # ──────────────────────────────────────────────

  Scenario: Guest does not see the room name edit icon in the sidebar
    Given a host and a guest are connected in the same room
    Then the guest does not see the room name edit button

  # ──────────────────────────────────────────────
  # COPY ROOM CODE
  # ──────────────────────────────────────────────

  Scenario: Host copies the room code to clipboard via the copy button
    Given I am the host of a room
    When I click the copy room code button
    Then a visual confirmation of the copy action is shown

  Scenario: Copied room code is exactly 4 digits
    Given I am the host of a room
    When I click the copy room code button
    Then the clipboard contains exactly 4 numeric characters

  # ──────────────────────────────────────────────
  # SEGURANÇA – INJEÇÃO E XSS
  # ──────────────────────────────────────────────

  @security
  Scenario: Message with HTML is rendered as plain text
    Given a host and a guest are connected in the same room
    When the host sends the message "<script>alert('xss')</script>"
    Then the guest sees the raw text "<script>alert('xss')</script>" in the chat
    And no script is executed in the browser

  # ──────────────────────────────────────────────
  # MENSAGENS – EDGE CASES
  # ──────────────────────────────────────────────

  Scenario: Very long message is displayed without breaking the layout
    Given a host and a guest are connected in the same room
    When the host sends a 500-character message
    Then the message is fully displayed in the guest's chat

  Scenario: Chat auto-scrolls to the latest message
    Given a host and a guest are connected in the same room
    When the host sends 20 messages in sequence
    Then the last message is visible in the guest's chat

  Scenario: System messages are visually distinct from user messages
    Given a host is in a room
    When a guest joins the room
    Then the system message has a different visual style than user messages

  # ──────────────────────────────────────────────
  # CICLO DE VIDA E ABA
  # ──────────────────────────────────────────────

  @slow
  Scenario: Returning to the tab after backgrounding shows current state
    Given a host and a guest are connected in the same room
    When the guest backgrounds the tab and returns
    Then the guest can still send messages

  # ──────────────────────────────────────────────
  # ACESSIBILIDADE / UX
  # ──────────────────────────────────────────────

  Scenario: Pressing Enter on the room code input triggers Join Room
    Given I am on the landing page
    When I type "9999" in the room code input
    And I press Enter on the room code input
    Then I see the error banner "Room not found or host disconnected."

  Scenario: Empty name is not saved when editing
    Given I am the host of a room
    When I click the edit icon next to my name
    And I clear the name input and press Enter
    Then my original name is still displayed

  @slow
  Scenario: Username with emojis renders correctly in the sidebar
    Given a host and a guest are connected in the same room
    When the guest renames themselves to "Go 🚀🎯"
    Then the guest sidebar shows "Go 🚀🎯 (You)"
    And the host sidebar shows "Go 🚀🎯"
