import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';


export type Target = 'ADMIN' | 'LINE_MANAGER' | 'TEAM';

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    readAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private base = 'http://localhost:4000/api/notification';
    private _items$ = new BehaviorSubject<AppNotification[]>([]);
    items$ = this._items$.asObservable();

    constructor(private http: HttpClient) { }

    loadMine() {
        return this.http.get<AppNotification[]>(`${this.base}/me`).pipe(
            tap(list => this._items$.next(list ?? []))
        );
    }
    send(payload: { recipientId: string; title: string; message: string }) {
        return this.http.post(`${this.base}/send`, payload);
    }

    markRead(id: string) {
        return this.http.post(`${this.base}/${id}/read`, {}).pipe(
            tap(() => {
                const next = this._items$.value.map(n =>
                    n.id === id ? { ...n, readAt: new Date().toISOString() } : n
                );
                this._items$.next(next);
            })
        );
    }

    getRecipients() {
        return this.http.get<any>(`${this.base}/recipients`);
    }
}