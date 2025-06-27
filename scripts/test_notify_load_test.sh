#!/usr/bin/env bash

# Required checks
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

if [ -z "${rampUpDuration}" ]; then
    echo "rampUpDuration is unset or set to the empty string"
    exit 1
fi

if [ -z "${arrivalRate}" ]; then
    echo "arrivalRate is unset or set to the empty string"
    exit 1
fi

if [ -z "${psu_api_key}" ]; then
    echo "psu_api_key is unset or set to the empty string"
    exit 1
fi

if [ -z "${psu_private_key}" ]; then
    echo "psu_private_key is unset or set to the empty string"
    exit 1
fi

if [ -z "${psu_kid}" ]; then
    echo "psu_kid is unset or set to the empty string"
    exit 1
fi

# Check artillery_key but don't fail — just omit recording if absent
if [ -z "${artillery_key}" ]; then
    echo "Warning: artillery_key is unset; running test without recording to Artillery Cloud."
    RECORD_ARGS=""
else
    RECORD_ARGS="--record --key ${artillery_key}"
fi

# Create a dotenv file with the variables for Artillery
cat <<EOF > runtimeenv.env
maxVusers=${maxVusers}
duration=${duration}
arrivalRate=${arrivalRate}
rampUpDuration=${rampUpDuration}
psu_api_key="${psu_api_key}"
psu_private_key="${psu_private_key}"
psu_kid="${psu_kid}"
artillery_key="${artillery_key}"
EOF

echo "Running Artillery test locally..."
echo ""
echo "Environment: ${environment}"
echo "Max Virtual Users: ${maxVusers}"
echo "Run Phase Duration: ${duration}"
echo "Ramp-up Duration: ${rampUpDuration}"
echo "Arrival Rate: ${arrivalRate}"
[ -n "${artillery_key}" ] && echo "Recording to Artillery Cloud with key: ${artillery_key}"
echo ""

set -e

# Run the Artillery test locally, conditionally including recording flags
npx artillery run \
    -e "${environment}" \
    --env-file "$(pwd)/runtimeenv.env" \
    --output "$(pwd)/notify_load_test.json" \
    $RECORD_ARGS \
    "$(pwd)/artillery/notify_load_test.yml"
