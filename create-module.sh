#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' 
BOLD='\033[1m'

# Banner
echo -e "${CYAN}${BOLD}"
echo "╔════════════════════════════════════════╗"
echo "║    InstantPay Module Generator         ║"
echo "║        Clean Architecture              ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Lista packages disponíveis
PACKAGES_DIR="packages"
if [ ! -d "$PACKAGES_DIR" ]; then
  echo -e "${RED} Erro: Diretório 'packages/' não encontrado${NC}"
  echo -e "${YELLOW} Execute este script da raiz do projeto${NC}"
  exit 1
fi

echo -e "${BOLD}📂 Packages disponíveis:${NC}\n"

# Lista packages com índice
packages=($(ls -d $PACKAGES_DIR/*/ 2>/dev/null | xargs -n 1 basename))

if [ ${#packages[@]} -eq 0 ]; then
  echo -e "${RED} Nenhum package encontrado em packages/${NC}"
  exit 1
fi

for i in "${!packages[@]}"; do
  index=$((i + 1))
  package="${packages[$i]}"
  
  # Verifica se tem src/modules
  if [ -d "$PACKAGES_DIR/$package/src/modules" ]; then
    modules_count=$(ls -d $PACKAGES_DIR/$package/src/modules/*/ 2>/dev/null | wc -l)
    echo -e "  ${GREEN}$index)${NC} ${BOLD}$package${NC} ${CYAN}($modules_count módulos)${NC}"
  else
    echo -e "  ${YELLOW}$index)${NC} ${BOLD}$package${NC} ${YELLOW}(sem src/modules)${NC}"
  fi
done

echo ""
echo -e "${BOLD}Escolha o package [1-${#packages[@]}]:${NC} "
read -r package_choice

# Valida escolha
if ! [[ "$package_choice" =~ ^[0-9]+$ ]] || [ "$package_choice" -lt 1 ] || [ "$package_choice" -gt "${#packages[@]}" ]; then
  echo -e "${RED} Escolha inválida${NC}"
  exit 1
fi

SELECTED_PACKAGE="${packages[$((package_choice - 1))]}"
MODULES_DIR="$PACKAGES_DIR/$SELECTED_PACKAGE/src/modules"

echo -e "${GREEN}✓${NC} Package selecionado: ${BOLD}$SELECTED_PACKAGE${NC}\n"

# Cria src/modules se não existir
if [ ! -d "$MODULES_DIR" ]; then
  echo -e "${YELLOW} Diretório src/modules não existe. Criando...${NC}"
  mkdir -p "$MODULES_DIR"
fi

# Lista módulos existentes
if [ -d "$MODULES_DIR" ] && [ "$(ls -A $MODULES_DIR 2>/dev/null)" ]; then
  echo -e "${BOLD} Módulos existentes:${NC}"
  ls -d $MODULES_DIR/*/ 2>/dev/null | xargs -n 1 basename | while read module; do
    echo -e "   ${PURPLE}•${NC} $module"
  done
  echo ""
fi

# Pergunta nome do módulo
echo -e "${BOLD}Digite o nome do módulo (plural, ex: users):${NC} "
read -r MODULE_PLURAL

if [ -z "$MODULE_PLURAL" ]; then
  echo -e "${RED} Nome do módulo não pode ser vazio${NC}"
  exit 1
fi

# Converte plural para singular
if [[ $MODULE_PLURAL == *ies ]]; then
  MODULE_SINGULAR="${MODULE_PLURAL%ies}y"
elif [[ $MODULE_PLURAL == *s ]]; then
  MODULE_SINGULAR="${MODULE_PLURAL%s}"
else
  MODULE_SINGULAR=$MODULE_PLURAL
fi

BASE_DIR="$MODULES_DIR/$MODULE_PLURAL"

# Verifica se módulo já existe
if [ -d "$BASE_DIR" ]; then
  echo -e "${RED} Módulo '$MODULE_PLURAL' já existe em $SELECTED_PACKAGE${NC}"
  exit 1
fi

echo ""
echo -e "${CYAN} Criando módulo:${NC} ${BOLD}$MODULE_PLURAL${NC} ${CYAN}→${NC} ${MODULE_SINGULAR}"
echo -e "${CYAN} Local:${NC} $BASE_DIR"
echo ""

# Cria estrutura de diretórios
mkdir -p "$BASE_DIR"/{domain/entities,domain/exceptions,domain/events}
mkdir -p "$BASE_DIR"/application/{use-cases,dtos,ports,validators}
mkdir -p "$BASE_DIR"/infrastructure/{http/controllers,http/routes,persistence}

# Domain Layer
touch "$BASE_DIR/domain/entities/${MODULE_SINGULAR}.entity.ts"
touch "$BASE_DIR/domain/exceptions/${MODULE_SINGULAR}.exception.ts"
touch "$BASE_DIR/domain/events/${MODULE_SINGULAR}.event.ts"

# Application Layer
touch "$BASE_DIR/application/dtos/create-${MODULE_SINGULAR}.dto.ts"
touch "$BASE_DIR/application/dtos/update-${MODULE_SINGULAR}.dto.ts"
touch "$BASE_DIR/application/dtos/${MODULE_SINGULAR}.response.dto.ts"
touch "$BASE_DIR/application/ports/${MODULE_SINGULAR}.repository.port.ts"
touch "$BASE_DIR/application/validators/create-${MODULE_SINGULAR}.validator.ts"
touch "$BASE_DIR/application/validators/update-${MODULE_SINGULAR}.validator.ts"

# Use Cases
touch "$BASE_DIR/application/use-cases/create-${MODULE_SINGULAR}.use-case.ts"
touch "$BASE_DIR/application/use-cases/find-all-${MODULE_PLURAL}.use-case.ts"
touch "$BASE_DIR/application/use-cases/find-${MODULE_SINGULAR}-by-id.use-case.ts"
touch "$BASE_DIR/application/use-cases/update-${MODULE_SINGULAR}.use-case.ts"
touch "$BASE_DIR/application/use-cases/delete-${MODULE_SINGULAR}.use-case.ts"

# Infrastructure Layer
touch "$BASE_DIR/infrastructure/persistence/${MODULE_SINGULAR}.repository.ts"
touch "$BASE_DIR/infrastructure/http/controllers/${MODULE_SINGULAR}.controller.ts"
touch "$BASE_DIR/infrastructure/http/routes/${MODULE_SINGULAR}.routes.ts"

# Module index
touch "$BASE_DIR/index.ts"

echo -e "${GREEN}${BOLD} Módulo criado com sucesso!${NC}\n"

echo -e "${BOLD}Estrutura gerada:${NC}\n"
tree "$BASE_DIR" -L 4 2>/dev/null || find "$BASE_DIR" -type f | sed 's|[^/]*/| |g'

echo ""
echo -e "${CYAN}${BOLD} Próximos passos:${NC}"
echo -e "   ${PURPLE}1.${NC} cd $PACKAGES_DIR/$SELECTED_PACKAGE/src/modules/$MODULE_PLURAL"
echo -e "   ${PURPLE}2.${NC} Implementar entidade em ${BOLD}domain/entities/${MODULE_SINGULAR}.entity.ts${NC}"
echo -e "   ${PURPLE}3.${NC} Definir DTOs em ${BOLD}application/dtos/${NC}"
echo -e "   ${PURPLE}4.${NC} Criar repository em ${BOLD}infrastructure/persistence/${NC}"
echo ""