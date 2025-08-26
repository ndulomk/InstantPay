# `core-banking`

1. DEPÓSITO EM DINHEIRO

Cliente deposita AOA 1000 em espécie

LANÇAMENTOS:
Débito:  Caixa (Ativo)                    + AOA 1000
Crédito: Conta Corrente Cliente (Passivo) + AOA 1000

EVENTOS:
- CashDepositInitiated
- CashDepositValidated  
- AccountCredited
- CashDepositCompleted


2. TRANSFERÊNCIA DE OUTRO BANCO

Cliente recebe AOA 500 de outro banco

LANÇAMENTOS:
Débito:  Reservas Bancárias (Ativo)       + AOA 500
Crédito: Conta Corrente Cliente (Passivo) + AOA 500

EVENTOS:
- IncomingTransferReceived
- TransferValidated
- AccountCredited
- TransferCompleted

3. TRANSFERÊNCIA PARA OUTRO BANCO

Cliente transfere AOA 800 para outro banco

LANÇAMENTOS:
Débito:  Conta Corrente Cliente (Passivo) - AOA 800
Crédito: Reservas Bancárias (Ativo)       - AOA 800

EVENTOS:
- OutgoingTransferInitiated
- BalanceValidated
- InterBankTransferSent
- AccountDebited
- TransferCompleted

4. SAQUE EM DINHEIRO

Cliente saca AOA 300

LANÇAMENTOS:
Débito:  Conta Corrente Cliente (Passivo) - AOA 300
Crédito: Caixa (Ativo)                    - AOA 300

EVENTOS:
- CashWithdrawalInitiated
- BalanceValidated
- CashDispensed
- AccountDebited
- CashWithdrawalCompleted


FÓRMULA SAGRADA: ATIVO = PASSIVO + PATRIMÔNIO LÍQUIDO


REGRA #1: RESERVAS OBRIGATÓRIAS

Depósitos totais: AOA 1.000.000
Reserva obrigatória (4.5%): AOA 45.000

LANÇAMENTO OBRIGATÓRIO:
Débito:  Reservas Banco Central (Ativo) + AOA 45.000
Crédito: Caixa (Ativo)                  - AOA 45.000


REGRA #2: COMPLIANCE & AUDITORIA

Toda transação deve ser:

Rastreável (quem, quando, quanto, por quê)
Imutável (não pode ser alterada depois)
Auditável (relatórios para Banco Central)