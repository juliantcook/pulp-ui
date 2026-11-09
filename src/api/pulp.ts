import Cookies from 'js-cookie';
import { config } from 'src/ui-config';
import { BaseAPI } from './base';

export class PulpAPI extends BaseAPI {
  mapPageToOffset = true; // offset & limit
  sortParam = 'ordering';

  constructor() {
    super();

    this.http.interceptors.request.use((request) => {
      request.withCredentials = Boolean(config.UI_EXTERNAL_LOGIN_URI);
      if (config.UI_EXTERNAL_LOGIN_URI) {
        delete request.auth;
      } else if (!request.auth) {
        const credentials = JSON.parse(
          window.sessionStorage.credentials ||
            window.localStorage.credentials ||
            '{}',
        );
        if (
          credentials.authentication !== 'session' &&
          credentials.username &&
          credentials.password
        ) {
          request.auth = credentials;
        }
      }

      request.baseURL = config.API_BASE_PATH;
      request.headers['X-CSRFToken'] = Cookies.get('csrftoken');

      return request;
    });
  }
}
