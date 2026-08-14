import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PHP_BIN = process.env.PHP_BIN || 'php';
const MAIL_LOG = path.join(ROOT, 'storage', 'logs', 'mail.log');

/** Run a fixture command against the dev DB and parse its JSON output. */
function fixture(cmd, args = []) {
    const cmdline = `"${PHP_BIN}" ${path.join(ROOT, 'tests', 'e2e', 'helpers', 'fixtures.php')} ${cmd} ${args.join(' ')}`;
    const stdout = execSync(cmdline, { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
    return JSON.parse(stdout);
}

// Tokens are cached per run: the admin login endpoint is rate-limited
// (5/min/IP) and every test logging in fresh would trip the limiter.
let cachedAdminToken = null;
let cachedUserToken = null;

/** Login against the admin API and return the bearer token (cached). */
async function adminToken(request, email, password) {
    if (! cachedAdminToken) {
        const res = await request.post('/api/auth/admin/login', { data: { email, password } });
        expect(res.status(), `admin login ${email} should succeed`).toBe(200);
        cachedAdminToken = (await res.json()).token;
    }
    return cachedAdminToken;
}

/** Login against the regular-user API and return the bearer token (cached). */
async function userToken(request, email, password) {
    if (! cachedUserToken) {
        const res = await request.post('/api/auth/login', { data: { email, password } });
        expect(res.status(), `user login ${email} should succeed`).toBe(200);
        cachedUserToken = (await res.json()).token;
    }
    return cachedUserToken;
}

/** Wall-clock date-time in Asia/Kuala_Lumpur (server interprets times in KL). */
function klIso(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
        + `T${pad(d.getHours())}:${pad(d.getMinutes())}:00+08:00`;
}

function klDate(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

let fx;

test.beforeAll(() => {
    fx = fixture('seed');
});

// ---------------------------------------------------------------------------
// API-level scoping: the server must enforce room boundaries even when the
// UI hides them.
// ---------------------------------------------------------------------------
test.describe('Room admin — API scoping', () => {
    test.beforeEach(() => {
        fx = fixture('seed'); // deterministic pending state for every test
        fixture('clear-throttle'); // avoid the login rate limiter across tests
    });

    test('login returns room_admin role and assigned room scope', async ({ request }) => {
        const res = await request.post('/api/auth/admin/login', {
            data: { email: fx.roomAdmin.email, password: fx.roomAdmin.password },
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.user.role).toBe('room_admin');
        expect(body.user.admin_rooms.map((r) => r.id)).toEqual([fx.assignedRoom.id]);
        expect(body.user.location_id).toBe(fx.locations.tpm.id);
    });

    test('bookings list and tab counts contain only assigned-room bookings', async ({ request }) => {
        const token = await adminToken(request, fx.roomAdmin.email, fx.roomAdmin.password);
        const res = await request.get('/api/admin/bookings', {
            headers: { Authorization: `Bearer ${token}` },
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        const titles = body.data.map((b) => b.title);

        expect(titles).toContain('E2E Assigned Room Booking');
        expect(titles).not.toContain('E2E Other Room Booking');
        expect(titles).not.toContain('E2E KHTP Room Booking');
        expect(body.counts.pending).toBe(1); // only the assigned-room pending booking
    });

    test('approve is denied on other rooms and allowed on the assigned room', async ({ request }) => {
        const token = await adminToken(request, fx.roomAdmin.email, fx.roomAdmin.password);

        const denied = await request.post(`/api/admin/bookings/${fx.otherBookingId}/approve`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(denied.status()).toBe(403);

        const crossCampus = await request.post(`/api/admin/bookings/${fx.khtpBookingId}/approve`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(crossCampus.status()).toBe(403);

        const allowed = await request.post(`/api/admin/bookings/${fx.assignedBookingId}/approve`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(allowed.status()).toBe(200);
        expect((await allowed.json()).booking.status).toBe('approved');
    });

    test('rooms index, dashboard and calendar are scoped to assigned rooms', async ({ request }) => {
        const token = await adminToken(request, fx.roomAdmin.email, fx.roomAdmin.password);
        const auth = { headers: { Authorization: `Bearer ${token}` } };

        const rooms = await request.get('/api/admin/rooms', auth);
        expect(rooms.status()).toBe(200);
        const roomNames = (await rooms.json()).map((r) => r.name);
        expect(roomNames).toEqual([fx.assignedRoom.name]);

        const dash = await request.get('/api/admin/dashboard', auth);
        expect(dash.status()).toBe(200);
        expect((await dash.json()).stats.total_rooms).toBe(1);

        const cal = await request.get(
            `/api/admin/calendar?start_date=2026-01-01&end_date=2026-12-31`,
            auth
        );
        expect(cal.status()).toBe(200);
        const events = await cal.json();
        const eventTitles = events.map((e) => e.title);
        expect(eventTitles).toContain('E2E Assigned Room Booking');
        expect(eventTitles).not.toContain('E2E Other Room Booking');
    });

    test('blackout creation is denied on rooms outside the scope', async ({ request }) => {
        const token = await adminToken(request, fx.roomAdmin.email, fx.roomAdmin.password);
        const start = new Date(Date.now() + 8 * 86_400_000);
        start.setHours(8, 0, 0, 0);
        const end = new Date(start.getTime() + 2 * 3_600_000);

        const denied = await request.post('/api/admin/blackouts', {
            headers: { Authorization: `Bearer ${token}` },
            data: {
                room_id: fx.otherRoom.id,
                title: 'E2E Sneaky Blackout',
                start_time: klIso(start),
                end_time: klIso(end),
            },
        });
        expect(denied.status()).toBe(422);

        const allowed = await request.post('/api/admin/blackouts', {
            headers: { Authorization: `Bearer ${token}` },
            data: {
                room_id: fx.assignedRoom.id,
                title: 'E2E Maintenance',
                start_time: klIso(start),
                end_time: klIso(end),
            },
        });
        expect(allowed.status()).toBe(201);
    });

    test('CSV export contains only assigned-room rows', async ({ request }) => {
        const token = await adminToken(request, fx.roomAdmin.email, fx.roomAdmin.password);
        const res = await request.get('/api/admin/bookings/export', {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(res.status()).toBe(200);
        const csv = await res.text();
        expect(csv).toContain('E2E Assigned Room Booking');
        expect(csv).not.toContain('E2E Other Room Booking');
        expect(csv).not.toContain('E2E KHTP Room Booking');
    });

    test('room admin receives the new-booking email for their assigned room', async ({ request }) => {
        const before = fs.existsSync(MAIL_LOG) ? fs.statSync(MAIL_LOG).size : 0;

        // Regular user books the assigned room (outside seed slots).
        const token = await userToken(request, fx.regularUser.email, fx.regularUser.password);
        const start = new Date(Date.now() + 6 * 86_400_000);
        start.setHours(11, 0, 0, 0);
        const end = new Date(start.getTime() + 3_600_000);

        const booking = await request.post('/api/bookings', {
            headers: { Authorization: `Bearer ${token}` },
            data: {
                room_id: fx.assignedRoom.id,
                title: 'E2E Notification Booking',
                start_date: klDate(start),
                end_date: klDate(start),
                start_time: klIso(start),
                end_time: klIso(end),
                attendees: 4,
                phone: '+60120000000',
            },
        });
        expect(booking.status(), JSON.stringify(await booking.json())).toBe(201);

        // Process the queued notification mail.
        execSync(
            `"${PHP_BIN}" artisan queue:work --stop-when-empty --tries=1 --timeout=60`,
            { cwd: ROOT, encoding: 'utf8', timeout: 120_000 }
        );

        const newMail = fs.readFileSync(MAIL_LOG, 'utf8').slice(before);
        expect(newMail).toContain('e2e.roomadmin@example.com');
        expect(newMail).toContain('E2E Notification Booking');
    });
});

// ---------------------------------------------------------------------------
// UI-level flows
// ---------------------------------------------------------------------------
test.describe('Room admin — UI flows', () => {
    test.beforeEach(() => {
        fx = fixture('seed');
        fixture('clear-throttle'); // UI logins share the admin-login limiter
    });

    async function adminLogin(page, email, password) {
        await page.goto('/admin/login');
        await page.locator('#admin-email').fill(email);
        await page.locator('#admin-password').fill(password);
        await page.locator('#admin-login-button').click();
        await page.waitForURL('**/admin', { timeout: 15_000 });
    }

    test('super admin invites a room admin with a campus + room list', async ({ page }) => {
        await adminLogin(page, fx.superAdmin.email, fx.superAdmin.password);

        await page.goto('/admin/users');
        await page.getByRole('button', { name: 'Invite Administrator' }).click();

        const modal = page.locator('div.fixed.inset-0').last();
        const inviteEmail = `e2e.invite.${Date.now()}@example.com`;

        await modal.locator('input[type="email"]').fill(inviteEmail);
        await modal.getByRole('button', { name: 'Room Admin' }).click();
        await modal
            .locator('select')
            .selectOption({ label: `${fx.locations.tpm.name} (TPM)` });
        await modal.locator('label', { hasText: fx.assignedRoom.name }).click();
        await modal.locator('label', { hasText: fx.otherRoom.name }).click();
        await expect(modal.getByText('2 rooms selected')).toBeVisible();

        page.once('dialog', (dialog) => dialog.accept());
        await modal.getByRole('button', { name: 'Send Invite' }).click();

        // Invitation appears in the pending tab with its room list.
        await page.getByRole('button', { name: /Pending Invitations/ }).click();
        const row = page.locator('tr', { hasText: inviteEmail });
        await expect(row).toBeVisible();
        await expect(row).toContainText('Room Admin');
        await expect(row).toContainText(fx.assignedRoom.name);
        await expect(row).toContainText(fx.otherRoom.name);
    });

    test('super admin invites a location admin (explicit null room_ids path)', async ({ page }) => {
        await adminLogin(page, fx.superAdmin.email, fx.superAdmin.password);

        await page.goto('/admin/users');
        await page.getByRole('button', { name: 'Invite Administrator' }).click();

        const modal = page.locator('div.fixed.inset-0').last();
        const inviteEmail = `e2e.locinvite.${Date.now()}@example.com`;

        // The invite modal sends room_ids: null for non-room-admin roles;
        // the backend must accept it (regression for the whereIn(null) 500).
        await modal.locator('input[type="email"]').fill(inviteEmail);
        await modal.getByRole('button', { name: 'Location Admin' }).click();
        await modal
            .locator('select')
            .selectOption({ label: `${fx.locations.tpm.name} (TPM)` });

        page.once('dialog', (dialog) => dialog.accept());
        await modal.getByRole('button', { name: 'Send Invite' }).click();

        await page.getByRole('button', { name: /Pending Invitations/ }).click();
        const row = page.locator('tr', { hasText: inviteEmail });
        await expect(row).toBeVisible();
        await expect(row).toContainText('Location Admin');
    });

    test('claiming a room-admin invitation provisions the scoped account', async ({ page }) => {
        const invite = fixture('invite', [
            'e2e.claimant@example.com',
            'room_admin',
            String(fx.locations.tpm.id),
            String(fx.assignedRoom.id),
        ]);

        await page.goto(`/admin/setup-account?token=${invite.token}`);

        // Context panel shows the room scope before claiming.
        await expect(page.getByText('Room Administrator')).toBeVisible();
        await expect(page.getByText(fx.assignedRoom.name)).toBeVisible();

        await page.getByPlaceholder('John Doe').fill('E2E Claimant');
        await page.getByPlaceholder('Information Technology').fill('Facilities');
        await page.locator('input[type="password"]').nth(0).fill('ClaimPassword!23');
        await page.locator('input[type="password"]').nth(1).fill('ClaimPassword!23');
        await page.getByRole('button', { name: /Claim Account/ }).click();

        await page.waitForURL('**/admin', { timeout: 20_000 });

        // The claimed account sees only its assigned room.
        await page.goto('/admin/rooms');
        await expect(page.getByRole('heading', { name: 'Manage Rooms' })).toBeVisible();
        await expect(page.getByText(fx.assignedRoom.name)).toBeVisible();
        await expect(page.getByText(fx.otherRoom.name)).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Add Room' })).toHaveCount(0);
    });

    test('room admin panel shows only assigned rooms across pages', async ({ page }) => {
        await adminLogin(page, fx.roomAdmin.email, fx.roomAdmin.password);

        // Rooms: assigned room only, no create control.
        await page.goto('/admin/rooms');
        await expect(page.getByText(fx.assignedRoom.name)).toBeVisible();
        await expect(page.getByText(fx.otherRoom.name)).toHaveCount(0);
        await expect(page.getByText(fx.khtpRoom.name)).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Add Room' })).toHaveCount(0);

        // Bookings: pending tab shows only assigned-room bookings.
        await page.goto('/admin/bookings');
        await expect(page.getByText('E2E Assigned Room Booking')).toBeVisible();
        await expect(page.getByText('E2E Other Room Booking')).toHaveCount(0);
        await expect(page.getByText('E2E KHTP Room Booking')).toHaveCount(0);

        // Calendar: location filter locked; "Book Room" offers only the
        // assigned room.
        await page.goto('/admin/calendar');
        await page.getByRole('button', { name: 'Book Room' }).click();
        const modal = page.locator('div.fixed.inset-0').last();

        const locationSelect = modal.locator('select').nth(0);
        await expect(locationSelect).toBeDisabled();
        await expect(locationSelect).toHaveValue(String(fx.locations.tpm.id));

        const roomSelect = modal.locator('select').nth(1);

        // The modal locks its location via a React effect and loads rooms
        // asynchronously — wait for the assigned-room option to settle
        // before reading the option list. <option> elements are never
        // "visible" in Playwright's visibility model, so use a count-based
        // wait instead of toBeVisible().
        await expect(
            roomSelect.locator('option', { hasText: fx.assignedRoom.name })
        ).toHaveCount(1);

        const roomOptions = await roomSelect.locator('option').allTextContents();
        expect(roomOptions).toEqual(['Select Room', `${fx.assignedRoom.name} (Cap: 20)`]);
    });
});
