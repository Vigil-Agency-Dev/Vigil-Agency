import { getDB } from '../firestore';
import type { MCPTool } from './index';

export const allyTools: MCPTool[] = [
  {
    name: 'get_allies',
    description: 'Get all tracked allies from Moltbook — alignment levels, interaction history, posting themes.',
    inputSchema: {
      type: 'object',
      properties: {
        alignment: { type: 'string', enum: ['POTENTIAL', 'ALIGNED', 'CONFIRMED', 'TRUSTED'], description: 'Filter by alignment level' },
        platform: { type: 'string', description: 'Filter by platform (default: moltbook)' },
      },
      required: [],
    },
    handler: async (args) => {
      const db = getDB();
      let query = db.collection('allies').orderBy('handle');
      if (args.alignment) query = query.where('alignmentLevel', '==', args.alignment);
      if (args.platform) query = query.where('platform', '==', args.platform);
      const snap = await query.get();
      return { allies: snap.docs.map(d => ({ id: d.id, ...d.data() })), timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'get_ally',
    description: 'Get full profile for a specific ally — interaction history, themes, engagement recommendations.',
    inputSchema: {
      type: 'object',
      properties: { handle: { type: 'string', description: 'Ally handle (e.g., superior_sara, Starfish)' } },
      required: ['handle'],
    },
    handler: async (args) => {
      const db = getDB();
      const snap = await db.collection('allies').where('handle', '==', args.handle).limit(1).get();
      return snap.empty ? { error: 'Ally not found' } : { id: snap.docs[0].id, ...snap.docs[0].data() };
    },
  },
  {
    name: 'update_ally',
    description: 'Update an ally profile — change alignment level, add interaction, update notes.',
    inputSchema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        alignment: { type: 'string', enum: ['POTENTIAL', 'ALIGNED', 'CONFIRMED', 'TRUSTED'] },
        add_interaction: { type: 'object', properties: { type: { type: 'string' }, note: { type: 'string' } } },
        posting_themes: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
      },
      required: ['handle'],
    },
    handler: async (args) => {
      const db = getDB();
      const snap = await db.collection('allies').where('handle', '==', args.handle).limit(1).get();
      if (snap.empty) return { error: 'Ally not found' };
      const ref = snap.docs[0].ref;
      const data = snap.docs[0].data();
      const updates: any = { lastInteraction: new Date() };
      if (args.alignment) updates.alignmentLevel = args.alignment;
      if (args.posting_themes) updates.postingThemes = args.posting_themes;
      if (args.notes) updates.notes = args.notes;
      if (args.add_interaction) {
        const history = data.interactionHistory || [];
        history.push({ date: new Date().toISOString(), ...args.add_interaction });
        updates.interactionHistory = history;
      }
      await ref.set(updates, { merge: true });
      return { success: true, handle: args.handle, timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'create_ally',
    description: 'Register a new ally profile for tracking.',
    inputSchema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        platform: { type: 'string', description: 'Default: moltbook' },
        alignment: { type: 'string', enum: ['POTENTIAL', 'ALIGNED', 'CONFIRMED', 'TRUSTED'] },
        posting_themes: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
      },
      required: ['handle', 'alignment'],
    },
    handler: async (args) => {
      const db = getDB();
      const ref = await db.collection('allies').add({
        handle: args.handle, platform: args.platform || 'moltbook',
        alignmentLevel: args.alignment, postingThemes: args.posting_themes || [],
        lastInteraction: new Date(), interactionHistory: [],
        threatLevel: 'NONE', notes: args.notes || '',
      });
      return { success: true, id: ref.id, handle: args.handle, timestamp: new Date().toISOString() };
    },
  },
];
