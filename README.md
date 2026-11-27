# 🎓 PresenSee — Sistema de Monitoramento de Frequência Escolar

Frontend web do **PresenSee**, um sistema de acompanhamento da frequência escolar desenvolvido para apoiar a identificação precoce de estudantes em risco de evasão.

O projeto busca transformar informações de presença, ausência e acompanhamento pedagógico em indicadores que auxiliem monitores e gestores escolares na tomada de decisões preventivas.

## 📌 Sobre o projeto

O PresenSee é uma solução tecnológica voltada ao monitoramento da frequência de estudantes do ensino médio.

A plataforma reúne funcionalidades de acompanhamento escolar, visualização de indicadores, identificação de alertas, registros de intervenções e organização de informações dos estudantes.

O sistema também prevê o uso de reconhecimento facial para auxiliar no registro de presença, conforme a evolução das integrações com o backend.

O frontend é desenvolvido com **React, JavaScript e Vite**, utilizando uma arquitetura baseada em componentes reutilizáveis.

## 🎯 Objetivos

### Objetivo geral

Desenvolver uma plataforma que auxilie instituições de ensino na prevenção da evasão escolar por meio do monitoramento da frequência e do acompanhamento pedagógico.

### Objetivos específicos

- Facilitar o cadastro e a consulta de estudantes.
- Organizar alunos e turmas.
- Acompanhar indicadores de presença e ausência.
- Identificar situações de risco de evasão.
- Disponibilizar alertas para acompanhamento.
- Permitir registros no Diário do Monitor.
- Apoiar o planejamento e o acompanhamento de intervenções.
- Disponibilizar relatórios e indicadores para a equipe escolar.
- Estruturar acessos específicos para diferentes perfis de usuários.

## 👥 Público-alvo e perfis de acesso

A aplicação foi planejada para atender três perfis principais:

**Administrador (Admin)**

Responsável pela administração geral da plataforma, pelo gerenciamento de escolas e pela organização dos usuários.

**Gestão Escolar**

Responsável pelo acompanhamento das informações de uma instituição, incluindo alunos, equipe, indicadores e relatórios.

**Monitor**

Responsável pelo acompanhamento dos estudantes, consulta de alertas, registros no diário e acompanhamento de intervenções.

A separação das áreas por perfil está prevista na arquitetura do frontend. A autorização definitiva depende da integração com o backend.

## 🛠️ Tecnologias utilizadas

| Tecnologia | Finalidade |
|---|---|
| React | Desenvolvimento da interface |
| Vite | Ambiente de desenvolvimento e build |
| JavaScript / JSX | Implementação dos componentes e funcionalidades |
| React Router DOM | Gerenciamento de rotas e navegação |
| Axios | Comunicação com a API |
| CSS | Estilização e identidade visual |
| LocalStorage | Persistência local de preferências e dados de sessão |

## ⚙️ Funcionalidades do frontend

### Interface e navegação

- Tela inicial de apresentação do sistema.
- Tela de login.
- Dashboard com indicadores e elementos visuais.
- Sidebar de navegação.
- Menu lateral expansível e recolhível.
- Alternância entre tema claro e escuro.
- Componentes reutilizáveis.
- Navegação entre páginas com React Router.

### Acompanhamento escolar

- Interface de cadastro de alunos.
- Listagem de estudantes.
- Perfil individual do aluno.
- Organização de turmas.
- Tela de acompanhamento da frequência.
- Visualização de alertas.
- Área de intervenções.
- Diário do Monitor.
- Interface de relatórios.

### Perfil e personalização

- Página de perfil do Monitor.
- Exibição de informações do usuário.
- Personalização da foto de perfil.
- Persistência local de preferências visuais.
- Funcionalidade de encerramento da sessão.

### Recursos em desenvolvimento ou integração

- Dashboards específicos para Admin e Gestão Escolar.
- Gerenciamento administrativo de escolas e usuários.
- Permissões definitivas por perfil.
- Integração completa dos dados com o backend.
- Cadastro e reconhecimento biométrico facial.
- Geração automatizada de relatórios.
- Processamento automático de alertas de evasão.

A existência de uma interface no frontend não significa necessariamente que toda a funcionalidade esteja integrada e operacional no backend.

## 🧠 Regras de negócio previstas

O projeto considera os seguintes critérios de acompanhamento escolar:

- Estudantes com mais de **25% de faltas** devem ser sinalizados para acompanhamento.
- **Quatro faltas consecutivas** devem gerar um alerta imediato.
- Relatórios mensais devem apoiar o acompanhamento da frequência escolar.

Esses critérios fazem parte das regras documentadas do projeto e dependem de implementação e validação na lógica definitiva do sistema.

## 📊 Indicadores de acompanhamento

Entre os indicadores previstos estão:

- Taxa de frequência dos estudantes.
- Quantidade de alunos em situação de risco.
- Total de faltas por turma.
- Evolução mensal da presença.
- Alertas de acompanhamento.
- Registros de intervenções pedagógicas.

## 🏗️ Arquitetura do frontend

O frontend do PresenSee utiliza React com Vite e possui uma arquitetura organizada por responsabilidades, separando páginas, componentes reutilizáveis, layouts, serviços, dados e estilos.

A estrutura de diretórios foi organizada para facilitar a manutenção e permitir a evolução independente das áreas de Administração, Gestão Escolar e Monitoramento.

### Estrutura de diretórios

```text
FRONT-END-PRESENSEE/
│
├── presensee/
│   └── frontend/
│       │
│       ├── public/
│       │
│       ├── src/
│       │   │
│       │   ├── assets/
│       │   │
│       │   ├── components/
│       │   │   ├── AlunoModal.jsx
│       │   │   ├── ExpandButton.jsx
│       │   │   ├── GaugeChart.jsx
│       │   │   ├── Icons.jsx
│       │   │   ├── ProtectedRoute.jsx
│       │   │   └── Sidebar.jsx
│       │   │
│       │   ├── data/
│       │   │
│       │   ├── layouts/
│       │   │   └── DashboardLayout.jsx
│       │   │
│       │   ├── pages/
│       │   │   │
│       │   │   ├── admin/
│       │   │   │   ├── DashboardAdmin.jsx
│       │   │   │   ├── Escolas.jsx
│       │   │   │   └── Usuarios.jsx
│       │   │   │
│       │   │   ├── gestao/
│       │   │   │   ├── DashboardGestao.jsx
│       │   │   │   ├── Alunos.jsx
│       │   │   │   ├── Equipe.jsx
│       │   │   │   ├── Acompanhamento.jsx
│       │   │   │   └── Relatorios.jsx
│       │   │   │
│       │   │   ├── monitor/
│       │   │   │   ├── Dashboard.jsx
│       │   │   │   ├── Alunos.jsx
│       │   │   │   ├── AlunoPerfil.jsx
│       │   │   │   ├── NovoAluno.jsx
│       │   │   │   ├── Alertas.jsx
│       │   │   │   ├── Frequencia.jsx
│       │   │   │   ├── Intervencao.jsx
│       │   │   │   ├── Diario.jsx
│       │   │   │   ├── Turmas.jsx
│       │   │   │   ├── Relatorios.jsx
│       │   │   │   └── PerfilMonitor.jsx
│       │   │   │
│       │   │   └── publicas/
│       │   │       ├── Login.jsx
│       │   │       ├── Welcome.jsx
│       │   │       └── CadastroEscola.jsx
│       │   │
│       │   ├── services/
│       │   │   ├── api.js
│       │   │   └── auth.js
│       │   │
│       │   ├── styles/
│       │   │   ├── Alertas.css
│       │   │   ├── AlunoPerfil.css
│       │   │   ├── Alunos.css
│       │   │   ├── CadastroEscola.css
│       │   │   ├── Dashboard.css
│       │   │   ├── Diario.css
│       │   │   ├── Frequencia.css
│       │   │   ├── Intervencao.css
│       │   │   ├── Login.css
│       │   │   ├── NovoAluno.css
│       │   │   ├── PerfilMonitor.css
│       │   │   ├── Relatorios.css
│       │   │   ├── Sidebar.css
│       │   │   ├── theme.css
│       │   │   ├── Turmas.css
│       │   │   └── Welcome.css
│       │   │
│       │   ├── App.jsx
│       │   ├── index.css
│       │   └── main.jsx
│       │
│       ├── .gitignore
│       ├── eslint.config.js
│       ├── index.html
│       ├── package.json
│       ├── package-lock.json
│       ├── README.md
│       └── vite.config.js
│
├── package.json
├── package-lock.json
└── README.md
```

### Descrição dos diretórios e arquivos

**components/**

Contém componentes reutilizáveis utilizados em diferentes páginas:

- `AlunoModal.jsx`: componente de modal relacionado aos alunos.
- `ExpandButton.jsx`: botão de expansão de elementos da interface.
- `GaugeChart.jsx`: componente gráfico para apresentação de indicadores.
- `Icons.jsx`: centralização dos ícones utilizados na aplicação.
- `ProtectedRoute.jsx`: controle de acesso às rotas protegidas.
- `Sidebar.jsx`: menu lateral de navegação.

**layouts/**

- `DashboardLayout.jsx`: estrutura compartilhada das páginas internas, incluindo a Sidebar e a área principal de conteúdo.

**pages/admin/**

Responsável pelas interfaces administrativas da plataforma, incluindo dashboard, gerenciamento de escolas e usuários.

**pages/gestao/**

Concentra as interfaces destinadas à gestão escolar, incluindo acompanhamento dos alunos, equipe e relatórios.

**pages/monitor/**

Reúne as funcionalidades de acompanhamento pedagógico e monitoramento dos estudantes.

**pages/publicas/**

Contém as páginas acessíveis sem autenticação, como a apresentação inicial, login e cadastro de escola.

**services/**

- `api.js`: configuração do Axios para comunicação com o backend e envio automático do token de autenticação.
- `auth.js`: funções de gerenciamento da sessão, recuperação de usuário, consulta de token e logout.

**styles/**

Armazena os arquivos CSS responsáveis pela identidade visual, estilização dos componentes e apresentação das páginas.

**data/**

Diretório destinado à organização de dados auxiliares e dados utilizados pela aplicação.

**assets/**

Armazena recursos estáticos utilizados na interface, como imagens e outros arquivos visuais.

### Arquivos principais da aplicação

- `App.jsx`: configuração das rotas e organização da navegação.
- `main.jsx`: ponto de entrada da aplicação React.
- `index.css`: estilos globais.
- `vite.config.js`: configuração do ambiente Vite.
- `eslint.config.js`: configuração das regras de análise estática do código.
- `package.json`: dependências, metadados e scripts do projeto.

## 🔐 Autenticação e controle de acesso

O frontend possui uma estrutura inicial de autenticação com armazenamento local do token e funções auxiliares para gerenciamento da sessão.

O componente `ProtectedRoute` é utilizado para controlar o acesso às rotas protegidas.

A aplicação também está sendo preparada para trabalhar com diferentes perfis de usuário.

A autorização por perfil no frontend é uma camada de navegação e não substitui as verificações de segurança que devem ser realizadas no backend.

### Comunicação com a API

A aplicação utiliza Axios para centralizar as requisições HTTP.

Na configuração de desenvolvimento compartilhada, a API utiliza:

```text
http://localhost:3000/api
```

O serviço possui um interceptor que adiciona o token disponível ao cabeçalho `Authorization` das requisições.

O endpoint de autenticação utilizado é:

```http
POST /auth/login
```

A integração definitiva depende da disponibilidade e da configuração do backend.

## 🎨 Interface e experiência do usuário

A interface do PresenSee foi desenvolvida com foco em organização visual e facilidade de navegação.

Entre os recursos de interface estão:

- Identidade visual própria.
- Layout com navegação lateral.
- Cards de indicadores.
- Componentes gráficos.
- Alternância entre modo claro e escuro.
- Formulários e elementos interativos.
- Organização das páginas por funcionalidades.

O projeto busca oferecer uma experiência acessível e intuitiva para o acompanhamento escolar.

## 🚀 Como executar o projeto

### Pré-requisitos

- Node.js instalado.
- npm disponível.
- Git instalado.
- Editor de código, como Visual Studio Code.

### 1. Clonar o repositório

```bash
git clone https://github.com/SIN-disciplina-PI5/FRONT-END-PRESENSEE.git
```

### 2. Acessar a pasta do frontend

```bash
cd FRONT-END-PRESENSEE/presensee/frontend
```

### 3. Instalar as dependências

```bash
npm install
```

### 4. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Após iniciar, acesse o endereço local informado pelo Vite no terminal.

O endereço padrão costuma ser:

```text
http://localhost:5173
```

### 5. Integração com o backend

Algumas funcionalidades exigem que a API esteja em execução e acessível no endereço configurado em `src/services/api.js`.

Sem o backend, determinadas funcionalidades podem depender de dados de demonstração ou não estar disponíveis.

## 🔒 Segurança e privacidade

O projeto considera os seguintes aspectos:

- Proteção de rotas.
- Autenticação baseada em token.
- Organização de acessos por perfil.
- Encerramento de sessão.
- Separação entre frontend e backend.
- Cuidados com informações pessoais dos estudantes.
- Adequação às exigências aplicáveis da LGPD.

A implementação completa das medidas de segurança e privacidade depende da integração com o backend, da configuração de infraestrutura e da validação das regras de acesso.

## 👨‍💻 Equipe

- Miguel Augusto
- Echilin Taina
- Ygor de Tárcio
- Maysa Clara
- Ludmylla Dias
- Matheus Vinnycius
- Pedro Henrique Jerônimo
- Gabriel Soares

## 📌 Status do projeto

**🚧 Em desenvolvimento — Projeto Integrador V**

O frontend possui uma estrutura funcional de navegação, componentes reutilizáveis e páginas voltadas ao acompanhamento escolar.

As próximas etapas incluem a evolução das áreas administrativas, o aprimoramento das funcionalidades e a integração definitiva com os serviços do backend.

## 🤝 Contribuição

Para contribuir com o desenvolvimento:

1. Crie uma branch para a funcionalidade:

   `feature/nome-da-feature`

2. Desenvolva e teste as alterações.
3. Realize o commit das mudanças.
4. Envie as alterações para o repositório.
5. Abra um Pull Request para revisão.

## 🔗 Repositório

https://github.com/SIN-disciplina-PI5/FRONT-END-PRESENSEE

## 📄 Licença

Projeto acadêmico, desenvolvido para fins educacionais e sem fins lucrativos. Os termos formais de licenciamento devem ser definidos pelos responsáveis pelo repositório.
