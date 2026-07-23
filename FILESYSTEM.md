# FILESYSTEM.md

> **Ryzova Virtual File System (RVFS)**
>
> Official filesystem specification for RVDE and RyzovaOS.

---

# Overview

Ryzova uses a **Virtual File System (RVFS)**.

It is **not** a physical disk filesystem.

The browser provides storage through modern Web APIs.

RVDE virtualizes that storage into a complete operating system filesystem.

---

# Storage Providers

| Provider        | Purpose               |
| --------------- | --------------------- |
| OPFS            | Primary Storage       |
| IndexedDB       | Database & Fallback   |
| Cache API       | Runtime Cache         |
| Memory          | Temporary Files       |
| Cloud Providers | Optional User Storage |

---

# Root Structure

```text
/

├── system/
├── home/
├── apps/
├── runtime/
├── storage/
├── dev/
├── mount/
├── shared/
└── tmp/
```

---

# /system

Read Only

Contains everything required for Ryzova itself.

```text
system/

├── rvde/
│   ├── kernel/
│   ├── runtime/
│   ├── browser/
│   ├── scheduler/
│   ├── memory/
│   ├── ipc/
│   ├── storage/
│   ├── security/
│   └── api/
│
├── config/
├── themes/
├── icons/
├── wallpapers/
├── fonts/
└── logs/
```

Purpose

* Kernel
* System configuration
* Themes
* Icons
* Wallpapers
* Fonts
* Logs

Applications cannot modify this directory.

---

# /home

User space.

Every user receives an isolated home directory.

```text
home/

└── username/

    ├── Desktop/
    ├── Documents/
    ├── Downloads/
    ├── Pictures/
    ├── Videos/
    ├── Music/
    ├── Projects/
    ├── Workspace/
    ├── Apps/
    ├── Trash/
    └── Settings/
```

Purpose

* Personal files
* Projects
* Documents
* User settings

---

# /apps

Installed applications.

```text
apps/

├── Browser/
├── Files/
├── Terminal/
├── Store/
├── Settings/
├── Personalize/
└── Extensions/
```

Applications are isolated.

Each app owns its own data.

---

# /runtime

Temporary runtime environment.

```text
runtime/

├── processes/
├── packages/
├── cache/
├── temp/
├── sessions/
└── wasm/
```

Purpose

* Running processes
* Runtime cache
* WASM modules
* Active sessions

Cleared automatically when appropriate.

---

# /storage

Browser-backed persistent storage.

```text
storage/

├── opfs/
├── indexeddb/
├── cache/
├── cloud/
├── sync/
└── backups/
```

Purpose

* Persistent storage
* Synchronization
* Backups
* Cache

---

# /dev

Virtual devices.

```text
dev/

├── cpu
├── gpu
├── display
├── audio
├── network
├── camera
├── microphone
├── clipboard
└── filesystem
```

These are **Virtual Devices**.

Applications never communicate directly with browser APIs.

Everything goes through RVDE.

---

# /mount

Mounted external providers.

```text
mount/

├── local/
├── github/
├── vercel/
├── netlify/
├── supabase/
├── cloud/
└── external/
```

Purpose

External resources appear as mounted directories.

Example

```text
mount/github/project-name/
```

instead of

```
https://github.com/user/project
```

---

# /shared

Shared files.

```text
shared/
```

Accessible only through explicit permissions.

---

# /tmp

Temporary files.

```text
tmp/
```

Automatically cleaned.

Never guaranteed to persist.

---

# Permissions

| Folder  | Read             | Write            |
| ------- | ---------------- | ---------------- |
| system  | ✅                | ❌                |
| home    | ✅                | ✅                |
| apps    | ✅                | Limited          |
| runtime | Internal         | Internal         |
| storage | Internal         | Internal         |
| dev     | API Only         | ❌                |
| mount   | Depends Provider | Depends Provider |
| shared  | Permission Based | Permission Based |
| tmp     | ✅                | ✅                |

---

# Browser Mapping

| RVFS              | Browser           |
| ----------------- | ----------------- |
| storage/opfs      | OPFS              |
| storage/indexeddb | IndexedDB         |
| runtime/cache     | Cache API         |
| runtime/processes | Web Workers       |
| dev/gpu           | WebGPU            |
| dev/network       | Fetch / WebSocket |
| dev/filesystem    | OPFS Bridge       |

---

# Design Principles

* Everything is virtual.
* Browser is the hardware layer.
* Filesystem is provider-independent.
* Modules communicate through APIs.
* Users never interact directly with browser storage.
* Future storage providers can be added without redesign.

---

# Future Mount Providers

Examples

* Google Drive
* OneDrive
* Dropbox
* GitLab
* AWS S3
* Azure Storage
* Local Network
* USB (when browser APIs allow)

---

# Filesystem Rules

* `/system` is immutable.
* `/home` belongs to users.
* `/apps` contains installed applications.
* `/runtime` exists only while running.
* `/storage` abstracts browser persistence.
* `/dev` represents virtual hardware.
* `/mount` represents external resources.
* `/shared` is permission-controlled.
* `/tmp` is disposable.

---

# Version

Filesystem Version: **1.0**

Status: **Living Specification**

Any filesystem change must update this document before implementation.
