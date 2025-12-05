# ⚠️ Erro "Failed to execute 'fetch': Invalid value"

O erro que você está vendo (`TypeError: Failed to execute 'fetch' on 'Window': Invalid value`) acontece quando a URL do Supabase não está configurada corretamente no ambiente.

## Causa Provável
As variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão:
1. **Vazias** ou não definidas.
2. **Com espaços extras** (ex: `" https://..."` em vez de `"https://..."`).
3. **Com aspas desnecessárias** no painel da Vercel.

## Como Resolver

### Opção 1: Rodando Localmente (PC)
1. Abra o arquivo `.env` na raiz do projeto.
2. Certifique-se que as variáveis estão assim (SEM espaços e SEM aspas):
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-aqui
   ```
3. Se você não tem um projeto Supabase, crie um em [supabase.com](https://supabase.com) e pegue as chaves em `Settings > API`.

### Opção 2: Rodando na Vercel (Deploy)
1. Acesse o painel do seu projeto na Vercel.
2. Vá em **Settings > Environment Variables**.
3. Adicione as variáveis:
   - **Key:** `VITE_SUPABASE_URL` | **Value:** `https://seu-projeto.supabase.co`
   - **Key:** `VITE_SUPABASE_ANON_KEY` | **Value:** `sua-chave-anon-aqui`
4. **IMPORTANTE:** Após adicionar as variáveis, vá em **Deployments** e clique em **Redeploy** no último deploy para que as alterações tenham efeito.

## Diagnóstico
Adicionei uma verificação automática na tela de Login. Se aparecer o alerta **"Supabase não configurado!"**, significa que o sistema não está conseguindo ler as variáveis de ambiente.

