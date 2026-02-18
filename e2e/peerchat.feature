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
    And the guest types "GuestRenomeado" and presses Enter
    Then the guest sidebar shows "GuestRenomeado (You)"
    And the host sidebar shows "GuestRenomeado" for that user

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
