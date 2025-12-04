# 🚀 Guia Rápido - Configuração de Ambiente

## ⚡ Início Rápido (5 minutos)

### 1. Acesse as Configurações
- Faça login no ZucroPay
- Clique em **⚙️ Configurações** no menu lateral

### 2. Escolha o Modo

#### 🖥️ Para Desenvolvimento Local
```
Clique no card "Localhost"
✅ Pronto! URLs configuradas automaticamente
```

#### ☁️ Para Testes com Cliente (Ngrok)
```bash
# Terminal 1 - Inicie ngrok do backend
ngrok http 8000
# Copie a URL (ex: https://abc123.ngrok-free.app)

# Terminal 2 - Inicie ngrok do frontend  
ngrok http 5173
# Copie a URL (ex: https://xyz789.ngrok-free.app)
```
```
No ZucroPay:
1. Clique no card "Ngrok"
2. Clique "Editar URLs"
3. Cole as URLs dos túneis
4. Clique "Salvar"
✅ Pronto! Compartilhe a URL do frontend com o cliente
```

#### 🌐 Para Produção (VPS)
```
1. Clique no card "VPS"
2. Clique "Editar URLs"
3. Digite seu IP ou domínio:
   - Backend: http://123.456.789.0:8000
   - Frontend: http://123.456.789.0
4. Clique "Salvar"
✅ Pronto! Sistema configurado para produção
```

## 📋 Checklist Diário

### Desenvolvimento (Todo Dia)
- [ ] Backend rodando: `php -S localhost:8000 router.php`
- [ ] Frontend rodando: `npm run dev`
- [ ] Configuração: **Modo Localhost** ativo
- [ ] Pronto para codar! 🎉

### Demonstração Cliente (Quando Necessário)
- [ ] Backend rodando localmente
- [ ] Frontend rodando localmente
- [ ] Ngrok backend: `ngrok http 8000`
- [ ] Ngrok frontend: `ngrok http 5173`
- [ ] Configuração: **Modo Ngrok** ativo com URLs atualizadas
- [ ] Compartilhe a URL do frontend ngrok com o cliente
- [ ] Pronto para demonstrar! 🎉

### Produção (Uma Vez)
- [ ] Servidor VPS configurado
- [ ] Backend rodando no VPS
- [ ] Frontend buildado e servido pelo nginx
- [ ] Configuração: **Modo VPS** ativo com IP/domínio
- [ ] Pronto para produção! 🎉

## ⚠️ Problemas Comuns

| Problema | Solução Rápida |
|----------|---------------|
| Produto não encontrado | Verifique se a URL do backend está correta |
| CORS error | Reinicie o backend com `php -S localhost:8000 router.php` |
| Ngrok mostra aviso | Certifique-se que o modo "Ngrok" está ativo |
| Configuração não muda | Recarregue a página (Ctrl+R) |
| URLs ngrok mudaram | Atualize as URLs em Configurações → Editar URLs |

## 🆘 Resetar Tudo

Se algo der errado:
1. Vá em Configurações
2. Clique em **"Resetar para Padrão (Localhost)"**
3. Reinicie backend e frontend
4. Tente novamente

## 📖 Documentação Completa

Para detalhes completos, veja: **CONFIGURACAO_AMBIENTE.md**

---

**Dica Final:** Mantenha o modo "Localhost" ativo durante o desenvolvimento e só mude quando precisar testar com clientes ou fazer deploy! 🚀
