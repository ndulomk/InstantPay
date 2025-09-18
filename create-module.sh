#!/bin/bash

if [ -z "$1" ]; then
  echo "Uso: ./create-module.sh <nome-do-modulo-plural>"
  exit 1
fi

MODULE_PLURAL=$1
BASE_DIR="packages/core-banking/src/$MODULE_PLURAL"

if [[ $MODULE_PLURAL == *ies ]]; then
  MODULE_SINGULAR="${MODULE_PLURAL%ies}y"
elif [[ $MODULE_PLURAL == *s ]]; then
  MODULE_SINGULAR="${MODULE_PLURAL%s}"
else
  MODULE_SINGULAR=$MODULE_PLURAL
fi


mkdir -p $BASE_DIR/{controllers,models,repositories,routes,schemas,services,types}

touch $BASE_DIR/controllers/${MODULE_SINGULAR}.controller.ts
touch $BASE_DIR/models/${MODULE_SINGULAR}.model.ts
touch $BASE_DIR/repositories/${MODULE_SINGULAR}.repository.ts
touch $BASE_DIR/routes/${MODULE_SINGULAR}.routes.ts
touch $BASE_DIR/schemas/${MODULE_SINGULAR}.schema.ts
touch $BASE_DIR/services/${MODULE_SINGULAR}.service.ts
touch $BASE_DIR/types/${MODULE_SINGULAR}.types.ts

echo " Módulo '$MODULE_PLURAL' criado com arquivos no singular ($MODULE_SINGULAR.*) em $BASE_DIR"
