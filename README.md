# Usage

## Set environments

| Variable               | descriptions                                                                                  |
|------------------------|-----------------------------------------------------------------------------------------------|
| `FIREFLY_API_URL`      | the URL to your firefly API including `/api/v1`, example `https://example-firefly.com/api/v1` |
| `FIREFLY_ACCESS_TOKEN` | the access token generated in Firefly UI (Profile > OAuth > Personal Access Token)            |
| `PONTO_SYNC_ENABLED`   | set to `true` if you want to sync your Ponto accounts                                         |
| `PONTO_CLIENT_ID`      | your Ponto's integration client ID                                                            |
| `PONTO_CLIENT_SECRET`  | your Ponto's integration secret ID                                                            |
| `HOURS_BETWEEN_SYNCS`  | the numbers of hours to wait between 2 syncs, defaults to 6 hours                             |
| `PLUXEE_SYNC_ENABLED`  | Set to `true` if you want to sync your Pluxee transactions                                    |
| `PLUXEE_USERNAME`      | your Pluxee's username                                                                        |
| `PLUXEE_PASSWORD`      | your Pluxee's password                                                                        |

# Certificate warning

For some reason, the Root CA of Sectigo is not in the Alpine (nor in Ubuntu) trusted store, so it is included in the repository.