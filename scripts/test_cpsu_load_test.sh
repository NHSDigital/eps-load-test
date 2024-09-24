#!/usr/bin/env bash


if [ -z "${environment}" ]; then
    echo "environment is unset or set to the empty string"
    exit 1
fi

if [ -z "${maxVusers}" ]; then
    echo "maxVusers is unset or set to the empty string"
    exit 1
fi

if [ -z "${duration}" ]; then
    echo "duration is unset or set to the empty string"
    exit 1
fi

if [ -z "${arrivalRate}" ]; then
    echo "arrivalRate is unset or set to the empty string"
    exit 1
fi

if [ -z "${rampUpDuration}" ]; then
    echo "rampUpDuration is unset or set to the empty string"
    exit 1
fi

if [ -z "${cpsu_api_key}" ]; then
    echo "cpsu_api_key is unset or set to the empty string"
    exit 1
fi

if [ -z "${cpsu_private_key}" ]; then
    echo "cpsu_private_key is unset or set to the empty string"
    exit 1
fi

if [ -z "${cpsu_kid}" ]; then
    echo "cpsu_kid is unset or set to the empty string"
    exit 1
fi


# Create a dotenv file with the variables for Artillery
cat <<EOF > runtimeenv.env
maxVusers=${maxVusers}
duration=${duration}
arrivalRate=${arrivalRate}
rampUpDuration=${rampUpDuration}
cpsu_api_key="${cpsu_api_key}"
cpsu_private_key="${cpsu_private_key}"
cpsu_kid="${cpsu_kid}"
EOF

echo "Running Artillery test locally..."
echo ""
echo "Max Virtual Users: ${maxVusers}"
echo "Phase Duration: ${duration}"
echo "Arrival Rate: ${arrivalRate}"
echo "Ramp Up Duration: ${rampUpDuration}"
echo ""

set -e

# Run the Artillery test locally
npx artillery run \
    -e "${environment}" \
    --dotenv /workspaces/eps-load-test/runtimeenv.env \
    --output /workspaces/eps-load-test/cpsu_load_test.json \
    /workspaces/eps-load-test/artillery/cpsu_load_test.yml

# Generate a report from the test results
npx /workspaces/eps-load-test/artillery report cpsu_load_test.json
