#!/usr/bin/env bash

if [ -z "${maxVusers}" ]; then
    echo "maxVusers is unset or set to the empty string"
    exit 1
fi

if [ -z "${duration}" ]; then
    echo "duration is unset or set to the empty string"
    exit 1
fi

if [ -z "${environment}" ]; then
    echo "environment is unset or set to the empty string"
    exit 1
fi

if [ -z "${arrivalRate}" ]; then
    echo "arrivalRate is unset or set to the empty string"
    exit 1
fi

if ! [[ "${environment}" =~ ^(dev|ref)$ ]]
then 
    echo "environment must be dev or ref"
    exit 1
fi

security_group=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "vpc-resources:VpcDefaultSecurityGroup") | .Value' | grep -o '[^:]*$')
export security_group
vpc_subnets=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "vpc-resources:PrivateSubnets") | .Value' | grep -o '[^:]*$')
export vpc_subnets

artillery_worker_role_name=$(aws cloudformation list-exports --output json | jq -r '.Exports[] | select(.Name == "artillery-resources:ArtilleryWorkerRoleName") | .Value' | grep -o '[^:]*$')
export artillery_worker_role_name

# the real test
npx artillery run-fargate \
    --environment "${environment}" \
    --secret psu_api_key \
    --secret psu_private_key \
    --secret psu_kid \
    --region eu-west-2 \
    --cluster artilleryio-cluster \
    --security-group-ids "${security_group}" \
    --subnet-ids "${vpc_subnets}" \
    --task-role-name "${artillery_worker_role_name}" \
    --launch-config "{\"environment\": [{\"name\":\"maxVusers\", \"value\":\"${maxVusers}\"},{\"name\":\"duration\",\"value\":\"${duration}\"},{\"name\":\"arrivalRate\",\"value\":\"${arrivalRate}\"}]}"\
    --output psu_load_test.json \
    artillery/psu_load_test.yml

npx artillery report psu_load_test.json 
