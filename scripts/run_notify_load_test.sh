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

if [ -z "${rampUpDuration}" ]; then
    echo "rampUpDuration is unset or set to the empty string"
    exit 1
fi

if [ -z "${arrivalRate}" ]; then
    echo "arrivalRate is unset or set to the empty string"
    exit 1
fi

if ! [[ "${environment}" =~ ^(dev|ref)$ ]]; then 
    echo "environment must be dev or ref"
    exit 1
fi

security_group=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "artillery-resources:ArtillerySecurityGroupId") | .Value' | grep -o '[^:]*$')
export security_group
vpc_subnets=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "vpc-resources:PrivateSubnets") | .Value' | grep -o '[^:]*$')
export vpc_subnets

artillery_worker_role_name=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "artillery-resources:ArtilleryWorkerRoleName") | .Value' | grep -o '[^:]*$')
export artillery_worker_role_name

if [ -z "${artillery_key}" ]; then
    echo "artillery_key is unset. Running without --record to Artillery Cloud."
    RECORD_ARGS=""
else
    RECORD_ARGS="--record --key ${artillery_key}"
fi

cat <<EOF > runtimeenv.env
maxVusers=${maxVusers}
duration=${duration}
arrivalRate=${arrivalRate}
rampUpDuration=${rampUpDuration}
EOF

echo ${launch_config}

# shellcheck disable=SC2090,SC2086
npx artillery run-fargate \
    --environment "${environment}" \
    --secret psu_api_key psu_private_key psu_kid \
    --region eu-west-2 \
    --cluster artilleryio-cluster \
    --security-group-ids "${security_group}" \
    --subnet-ids "${vpc_subnets}" \
    --task-role-name "${artillery_worker_role_name}" \
    --env-file runtimeenv.env \
    --output notify_load_test.json \
    $RECORD_ARGS \
    artillery/notify_load_test.yml

npx artillery report notify_load_test.json
