import { createSignal, createResource } from 'solid-js';
import type { ConnectionFilter, ConnectionOrder } from './api';
import { fetchConnections } from './api';

export const LIMIT = 20;

export const [filter, setFilter] = createSignal<ConnectionFilter>('active');
export const [order,  setOrder]  = createSignal<ConnectionOrder>('name');
export const [search, setSearch] = createSignal('');
export const [page,   setPage]   = createSignal(0);

// Reactive key — changes trigger a refetch
const fetchKey = () => ({
  filter: filter(),
  order:  order(),
  search: search(),
  start:  page() * LIMIT,
  limit:  LIMIT,
});

export const [connectionsData, { refetch }] = createResource(
  fetchKey,
  (params) => fetchConnections(params),
);

