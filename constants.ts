import { TimelineData } from './types';

export const EMPTY_DATA: TimelineData = {
  meta: {
    appName: "VertiLine",
    version: "5.1",
    createdAt: new Date().toISOString()
  },
  events: []
};