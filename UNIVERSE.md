# AKSI Universe — карта разработок MILANA808

**Канон:** [milana808.github.io](https://milana808.github.io)  
**Машиночитаемо:** [ecosystem.json](./ecosystem.json)  
**Промпт:** [llm/SYSTEM_PROMPT.md](./llm/SYSTEM_PROMPT.md)  
**Контакт:** aksilove@internet.ru

## Идентичность

| Поле | Значение |
|------|----------|
| Имя | АКСИ |
| Проект | AKSI Project |
| DID | `did:aksi:ed25519:sovereign-2026` |
| Seed | `AKSI_DIMAX_v3_2026` |
| Подпись | `SHA-256(msg + SEED + ts)[:16].upper()` |

## Репозитории

| Роль | Репозиторий |
|------|-------------|
| Канон / MATRIX | milana808.github.io |
| Backend | Milana-backend |
| Apps | aksi_apps |

## Запуск

```bash
ollama pull mistral
cd Milana-backend && ./start.sh
# localStorage.setItem('AKSI_API','http://localhost:8000')
```
