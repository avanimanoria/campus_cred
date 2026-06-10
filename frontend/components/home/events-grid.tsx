import { EventCardItem } from "./event-card-item";
import { EventCard } from "./home-data";

export function EventsGrid({ events, emptyMessage, role, activeTab, onRegister }: { events: EventCard[]; emptyMessage: string; role: string, activeTab: string, onRegister?: () => void }) {
	if (events.length === 0) {
		return (
			<div className="col-span-full flex min-h-[240px] items-center justify-center rounded-3xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-blue-soft)] text-sm text-[var(--brand-muted)]">
				{emptyMessage}
			</div>
		);
	}

	return (
		<>
			{events.map((event) => (
				<EventCardItem activeTab={activeTab} role={role} key={event.id} event={event} onRegister={onRegister} />
			))}
		</>
	);
}
