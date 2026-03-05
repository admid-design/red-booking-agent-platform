import { buildSystemPrompt, buildGreeting } from '../src/agents/prompts';
import { getRealtimeTools, executeTool } from '../src/agents/tools';

// Mock the database and services so tests don't require a real DB
jest.mock('../src/database/models', () => ({
  findAvailability: jest.fn().mockResolvedValue([
    {
      id: 'avail-1',
      hostessId: 'hostess-1',
      date: new Date('2024-03-15'),
      startTime: '18:00',
      endTime: '20:00',
      isBooked: false,
    },
  ]),
  findHostesses: jest.fn().mockResolvedValue([
    {
      id: 'hostess-1',
      name: 'Sofia Martinez',
      bio: 'Fluent in English and Spanish',
      isActive: true,
      hourlyRate: 75,
    },
  ]),
  createBooking: jest.fn().mockResolvedValue({
    id: 'booking-1',
    userId: 'user-1',
    hostessId: 'hostess-1',
    date: new Date('2024-03-15'),
    startTime: '18:00',
    endTime: '20:00',
    guestCount: 4,
    status: 'pending',
    totalAmount: 140,
    depositAmount: 28,
  }),
  findBookingById: jest.fn().mockResolvedValue({
    id: 'booking-1',
    date: new Date('2024-03-15'),
    startTime: '18:00',
    endTime: '20:00',
    guestCount: 4,
    status: 'confirmed',
    totalAmount: 140,
    depositAmount: 28,
  }),
  upsertUser: jest.fn().mockResolvedValue({
    id: 'user-1',
    phone: '+15555550100',
  }),
  markAvailabilityBooked: jest.fn().mockResolvedValue(undefined),
}));

// ─── Prompts Tests ────────────────────────────────────────────────────────────

describe('Agent Prompts', () => {
  test('buildSystemPrompt returns a non-empty string', () => {
    const prompt = buildSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });

  test('buildSystemPrompt mentions business name', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('RED Entertainment');
  });

  test('buildSystemPrompt includes booking instructions', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('booking');
  });

  test('buildGreeting returns a non-empty string', () => {
    const greeting = buildGreeting();
    expect(typeof greeting).toBe('string');
    expect(greeting.length).toBeGreaterThan(10);
  });

  test('buildGreeting mentions the business', () => {
    const greeting = buildGreeting();
    expect(greeting).toContain('RED Entertainment');
  });
});

// ─── Tools Tests ──────────────────────────────────────────────────────────────

describe('Agent Tools', () => {
  test('getRealtimeTools returns an array of tools', () => {
    const tools = getRealtimeTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  test('each tool has required fields', () => {
    const tools = getRealtimeTools();
    for (const tool of tools) {
      expect(tool.type).toBe('function');
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.type).toBe('object');
    }
  });

  test('tool names are unique', () => {
    const tools = getRealtimeTools();
    const names = tools.map((t) => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  test('check_availability tool is registered', () => {
    const tools = getRealtimeTools();
    const tool = tools.find((t) => t.name === 'check_availability');
    expect(tool).toBeDefined();
    expect(tool?.parameters.required).toContain('date');
  });

  test('create_booking tool is registered', () => {
    const tools = getRealtimeTools();
    const tool = tools.find((t) => t.name === 'create_booking');
    expect(tool).toBeDefined();
  });

  test('list_hostesses tool is registered', () => {
    const tools = getRealtimeTools();
    const tool = tools.find((t) => t.name === 'list_hostesses');
    expect(tool).toBeDefined();
  });

  test('lookup_booking tool is registered', () => {
    const tools = getRealtimeTools();
    const tool = tools.find((t) => t.name === 'lookup_booking');
    expect(tool).toBeDefined();
  });
});

// ─── Tool Execution Tests ─────────────────────────────────────────────────────

describe('Tool Execution', () => {
  test('check_availability returns slots', async () => {
    const result = (await executeTool('check_availability', {
      date: '2024-03-15',
    })) as { date: string; availableSlots: unknown[] };
    expect(result.date).toBe('2024-03-15');
    expect(Array.isArray(result.availableSlots)).toBe(true);
  });

  test('list_hostesses returns hostess list', async () => {
    const result = (await executeTool('list_hostesses', {})) as {
      hostesses: Array<{ name: string }>;
    };
    expect(Array.isArray(result.hostesses)).toBe(true);
    expect(result.hostesses[0].name).toBe('Sofia Martinez');
  });

  test('create_booking returns booking details', async () => {
    const result = (await executeTool('create_booking', {
      date: '2024-03-15',
      start_time: '18:00',
      end_time: '20:00',
      guest_count: 4,
      phone_number: '+15555550100',
    })) as { success: boolean; bookingId: string };
    expect(result.success).toBe(true);
    expect(result.bookingId).toBe('booking-1');
  });

  test('lookup_booking returns booking by ID', async () => {
    const result = (await executeTool('lookup_booking', {
      booking_id: 'booking-1',
    })) as { success: boolean; status: string };
    expect(result.success).toBe(true);
    expect(result.status).toBe('confirmed');
  });

  test('executeTool throws for unknown tool', async () => {
    await expect(
      executeTool('unknown_tool', {})
    ).rejects.toThrow('Unknown tool: unknown_tool');
  });
});
