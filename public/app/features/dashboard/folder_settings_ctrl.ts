import { FolderPageLoader } from './folder_page_loader';
import appEvents from 'app/core/app_events';

export class FolderSettingsCtrl {
  folderPageLoader: FolderPageLoader;
  navModel: any;
  folderId: number;
  uid: string;
  canSave = false;
  dashboard: any;
  meta: any;
  title: string;
  hasChanged: boolean;

  /** @ngInject */
  constructor(private backendSrv, navModelSrv, private $routeParams, private $location) {
    if (this.$routeParams.uid) {
      this.uid = $routeParams.uid;

      this.folderPageLoader = new FolderPageLoader(this.backendSrv);
      this.folderPageLoader.load(this, this.uid, 'manage-folder-settings').then(folder => {
        if ($location.path() !== folder.meta.url) {
          $location.path(`${folder.meta.url}/settings`).replace();
        }

        this.dashboard = folder.dashboard;
        this.meta = folder.meta;
        this.canSave = folder.meta.canSave;
        this.title = this.dashboard.title;
      });
    }
  }

  save() {
    this.titleChanged();

    if (!this.hasChanged) {
      return;
    }

    this.dashboard.title = this.title.trim();

    return this.backendSrv
      .updateDashboardFolder(this.dashboard, { overwrite: false })
      .then(result => {
        if (result.url !== this.$location.path()) {
          this.$location.url(result.url + '/settings');
        }

        appEvents.emit('dashboard-saved');
        appEvents.emit('alert-success', ['Folder saved']);
      })
      .catch(this.handleSaveFolderError);
  }

  titleChanged() {
    this.hasChanged = this.dashboard.title.toLowerCase() !== this.title.trim().toLowerCase();
  }

  delete(evt) {
    if (evt) {
      evt.stopPropagation();
      evt.preventDefault();
    }

    appEvents.emit('confirm-modal', {
      title: 'Delete',
      text: `Do you want to delete this folder and all its dashboards?`,
      icon: 'fa-trash',
      yesText: 'Delete',
      onConfirm: () => {
        return this.backendSrv.deleteDashboard(this.dashboard.uid).then(() => {
          appEvents.emit('alert-success', ['Folder Deleted', `${this.dashboard.title} has been deleted`]);
          this.$location.url('dashboards');
        });
      },
    });
  }

  handleSaveFolderError(err) {
    if (err.data && err.data.status === 'version-mismatch') {
      err.isHandled = true;

      appEvents.emit('confirm-modal', {
        title: 'Conflict',
        text: 'Someone else has updated this folder.',
        text2: 'Would you still like to save this folder?',
        yesText: 'Save & Overwrite',
        icon: 'fa-warning',
        onConfirm: () => {
          this.backendSrv.updateDashboardFolder(this.dashboard, { overwrite: true });
        },
      });
    }

    if (err.data && err.data.status === 'name-exists') {
      err.isHandled = true;

      appEvents.emit('alert-error', ['A folder or dashboard with this name exists already.']);
    }
  }
}
