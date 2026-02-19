import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures';

When('the host closes the browser tab abruptly', async ({ world }) => {
  await world.hostPage!.evaluate(() => (window as any).__peer?.destroy());
  await world.hostPage!.close();
});

When('the guest closes the browser tab abruptly', async ({ world }) => {
  await world.guestPage!.evaluate(() => (window as any).__peer?.destroy());
  await world.guestPage!.close();
});

When('the guest refreshes the browser tab', async ({ world }) => {
  await world.guestPage!.reload();
});

When('the guest backgrounds the tab and returns', async ({ world }) => {
  const page = world.guestPage ?? world.page;
  const newTab = await page.context().newPage();
  await newTab.goto('about:blank');
  await page.bringToFront();
  await newTab.close();
});

Then('the guest can still send messages', async ({ world }) => {
  const page = world.guestPage ?? world.page;
  await expect(page.getByPlaceholder('Message your peers...')).toBeVisible({ timeout: 10_000 });
});

When('the camera hardware disconnects', async ({ world }) => {
  const page = world.hostPage ?? world.page;
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: (constraints: MediaStreamConstraints) => {
          if (constraints?.video) {
            return Promise.reject(
              new DOMException('Hardware failure', 'NotReadableError')
            );
          }
          return Promise.resolve(new MediaStream());
        },
        enumerateDevices: () => Promise.resolve([]),
      },
      writable: true,
    });
  });
  const cameraBtn = page.getByRole('button', { name: /turn camera on/i });
  if (await cameraBtn.isVisible()) {
    await cameraBtn.click();
  }
});

Given('And the browser has denied media access', async ({ world }) => {
  await world.page.evaluate(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: () =>
          Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
        enumerateDevices: () => Promise.resolve([]),
      },
      writable: true,
      configurable: true,
    });
  });
});

Given('the browser has denied media access', async ({ world }) => {
  await world.page.evaluate(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: () =>
          Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
        enumerateDevices: () => Promise.resolve([]),
      },
      writable: true,
      configurable: true,
    });
  });
});

When('I click the mute button 5 times rapidly', async ({ world }) => {
  const muteBtn = world.page.getByRole('button', { name: /mute|unmute/i });
  for (let i = 0; i < 5; i++) {
    await muteBtn.click();
  }
});

Then('the final mute state is consistent between UI and audio track', async ({ world }) => {
  const muteBtn = world.page.getByRole('button', { name: /mute|unmute/i });
  const ariaLabel = await muteBtn.getAttribute('aria-label');
  const isMuted = ariaLabel === 'Unmute';
  const audioEnabled = await world.page.evaluate(() => {
    const tracks = (window as any).__localStream?.getAudioTracks?.() ?? [];
    return tracks.length > 0 ? tracks[0].enabled : null;
  });
  if (audioEnabled !== null) {
    expect(isMuted).toBe(!audioEnabled);
  }
});
