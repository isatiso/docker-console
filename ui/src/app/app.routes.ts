import { Routes } from '@angular/router'
import { SidenavComponent } from './layout/sidenav/sidenav.component'
import { StationLayoutComponent } from './layout/station-layout/station-layout.component'

export const routes: Routes = [{
    path: '', component: StationLayoutComponent, children: [{
        path: '', component: SidenavComponent, children: [
            { path: 'host-exec', loadComponent: () => import('./pages/host-exec/host-exec.component').then(m => m.HostExecComponent) },
            { path: 'host-log', loadComponent: () => import('./pages/host-exec/host-exec.component').then(m => m.HostExecComponent) },
            { path: 'container-exec/:id', loadComponent: () => import('./pages/container-exec/container-exec.component').then(m => m.ContainerExecComponent) },
            { path: 'container-inspection/:id', loadComponent: () => import('./pages/container-inspection/container-inspection.component').then(m => m.ContainerInspectionComponent) },
            { path: 'containers', loadComponent: () => import('./pages/containers/containers.component').then(m => m.ContainersComponent) },
            { path: 'projects', loadComponent: () => import('./pages/projects/projects.component').then(m => m.ProjectsComponent) },
            { path: 'projects/:location', loadComponent: () => import('./pages/project-editor/project-editor.component').then(m => m.ProjectEditorComponent) },
            {
                matcher: (url) => {
                    console.log('url', url)
                    if (url[0].path === 'files') {
                        return { consumed: url, posParams: {} }
                    }
                    return null
                }, loadComponent: () => import('./pages/files/files.component').then(m => m.FilesComponent)
            },
            { path: 'files-edit/:location', loadComponent: () => import('./pages/file-editor/file-editor.component').then(m => m.FileEditorComponent) },
            { path: 'images', loadComponent: () => import('./pages/images/images.component').then(m => m.ImagesComponent) },
            { path: 'images/:id', loadComponent: () => import('./pages/image-inspection/image-inspection.component').then(m => m.ImageInspectionComponent) },
            { path: 'logs/:id', loadComponent: () => import('./pages/logs/logs.component').then(m => m.LogsComponent) },
            { path: 'networks', loadComponent: () => import('./pages/networks/networks.component').then(m => m.NetworksComponent) },
            { path: 'networks/:id', loadComponent: () => import('./pages/network-inspection/network-inspection.component').then(m => m.NetworkInspectionComponent) },
            { path: 'queue', loadComponent: () => import('./pages/queue/queue.component').then(m => m.QueueComponent) },
            { path: 'volumes', loadComponent: () => import('./pages/volumes/volumes.component').then(m => m.VolumesComponent) },
            { path: 'volumes/:id', loadComponent: () => import('./pages/volume-inspection/volume-inspection.component').then(m => m.VolumeInspectionComponent) },
            { path: '**', redirectTo: '/containers' },
        ]
    }]
}]
