#!/usr/bin/env bash

if [ -z "${API_KEY}" ]; then
    echo "API_KEY is unset or set to the empty string"
    exit 1
fi

artillery run artillery/psu_load_test.yml