# Artillery load testing

This repository contains some infrastructure to run load testing against specific Prescription Status Update (PSU) and Custom PSU (CPSU) builds. These are executed as github actions from this repository, and are configured with some basic parameters like max load, and ramp-up parameters.

Reports are generated as standalone webpage files, and are made available as artifacts on the github action.


# Development

There are some scripts that can be used to dry-run small versions of the load testing locally. Note that the targets will still be deployed stacks - the setup for this is configured in your `.envrc` file.

The .envrc file also needs to contain an API key corresponding to an app in the [developer hub](https://dos-internal.ptl.api.platform.nhs.uk/Index) - follow the setup instructions [here](https://nhsd-confluence.digital.nhs.uk/display/APIMC/EPS+Prescription+Status+Update+API+Authorisation) to create one. Place the private key in a `.pem` file in the root of this directory. The deployment environment must also be set, one of `["dev", "int", "ref"]`. Replace the elements wrapped in `<>`

```bash
export maxVusers=1
export duration=5
export arrivalRate=2
export rampUpDuration=1

export environment="<WHICH ENVIRONMENT YOU ARE LOAD TESTING>"

export cpsu_api_key="<YOUR API KEY>"

export psu_api_key="<YOUR API KEY>"
export psu_kid="<YOUR KID VALUE>"

psu_private_key=$(cat /workspaces/eps-load-test/psu_private_key.pem)
export psu_private_key
```

Note that the quotes are important - hyphens will break the variable loading process.

Valid environments are `dev`, `int`, `ref`, and `pr`.
A pull request deployment can be targeted with the local tests, by using the `pr` environment, and specifying a `prNumber` variable in the `.envrc` file.

Small-scale local load tests can then be run with `make` commands:
- `make local-psu`
- `make local-cpsu`
