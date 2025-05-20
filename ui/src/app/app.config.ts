import { provideHttpClient, withFetch } from '@angular/common/http'
import { ApplicationConfig, Injectable } from '@angular/core'
import { provideAnimations } from '@angular/platform-browser/animations'
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'
import { PreloadingStrategy, provideRouter, Route, withDebugTracing, withEnabledBlockingInitialNavigation, withPreloading,  } from '@angular/router'
import { BehaviorSubject, catchError, filter, Observable, of, tap } from 'rxjs'
import { routes } from './app.routes'

@Injectable({ providedIn: 'root' })
export class NdcPreloadAllModules implements PreloadingStrategy {
    private all_routes: Record<string, boolean> = {}
    all_finished$ = new BehaviorSubject<{ loaded: number, total: number }>({ loaded: 0, total: 0 })

    preload(route: Route, fn: () => Observable<any>): Observable<any> {
        this.all_routes[route.path ?? 'unknown'] = false
        this.all_finished$.next({
            loaded: Object.values(this.all_routes).filter(v => v).length,
            total: Object.values(this.all_routes).length
        })
        return fn().pipe(
            filter(data => data),
            tap(() => console.log(`loaded ${route.path}`)),
            tap(() => this.all_routes[route.path ?? 'unknown'] = true),
            tap(() => this.all_finished$.next({
                loaded: Object.values(this.all_routes).filter(v => v).length,
                total: Object.values(this.all_routes).length
            })),
            catchError(() => of(null))
        )
    }
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(
            routes,
            withEnabledBlockingInitialNavigation(),
            // withDebugTracing(),
            withPreloading(NdcPreloadAllModules),
        ),
        // provideClientHydration(
        //     withNoHttpTransferCache(),
        // ),
        provideHttpClient(
            withFetch(),
        ),
        provideAnimations(),
        provideAnimationsAsync(),
    ]

}
