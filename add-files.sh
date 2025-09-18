#!/bin/bash

if [ -z "$1" ]; then
  echo "Uso: ./add-files.sh <nome-do-modulo-plural> [arquivo1 arquivo2 ...] [--entity nome-singular-custom]"
  exit 1
fi

MODULE_PLURAL=$1
shift
BASE_DIR="src/modules/$MODULE_PLURAL"

# Verifica se o módulo existe
if [ ! -d "$BASE_DIR" ]; then
  echo "Erro: módulo '$MODULE_PLURAL' não existe em $BASE_DIR"
  exit 1
fi

# Define singular padrão
if [[ $MODULE_PLURAL == *ies ]]; then
  MODULE_SINGULAR="${MODULE_PLURAL%ies}y"
elif [[ $MODULE_PLURAL == *s ]]; then
  MODULE_SINGULAR="${MODULE_PLURAL%s}"
else
  MODULE_SINGULAR=$MODULE_PLURAL
fi

# Pega parâmetro opcional --entity
CUSTOM_ENTITY=""
NEW_ARGS=()

for arg in "$@"; do
  if [[ $arg == --entity=* ]]; then
    CUSTOM_ENTITY="${arg#--entity=}"
  else
    NEW_ARGS+=("$arg")
  fi
done

if [ -n "$CUSTOM_ENTITY" ]; then
  ENTITY=$CUSTOM_ENTITY
else
  ENTITY=$MODULE_SINGULAR
fi

# Se não forem passados arquivos, cria todos padrões
if [ ${#NEW_ARGS[@]} -eq 0 ]; then
  FILES=("controller" "model" "repository" "routes" "schema" "service" "types")
else
  FILES=("${NEW_ARGS[@]}")
fi

for FILE in "${FILES[@]}"; do
  case $FILE in
    controller) DIR="controllers";;
    model) DIR="models";;
    repository) DIR="repositories";;
    routes) DIR="routes";;
    schema) DIR="schemas";;
    service) DIR="services";;
    types) DIR="types";;
    *) 
      echo "Aviso: tipo de arquivo '$FILE' não reconhecido. Ignorado."
      continue
      ;;
  esac

  mkdir -p "$BASE_DIR/$DIR"
  FILE_PATH="$BASE_DIR/$DIR/${ENTITY}.${FILE}.ts"

  if [ ! -f "$FILE_PATH" ]; then
    touch "$FILE_PATH"
    echo "Criado: $FILE_PATH"
  else
    echo "Já existe: $FILE_PATH"
  fi
done

echo "Arquivos adicionados ao módulo '$MODULE_PLURAL' (entidade: $ENTITY)"
