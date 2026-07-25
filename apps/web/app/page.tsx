import Image, { type ImageProps } from "next/image";
import { Button } from "@repo/ui/button";
import styles from "./page.module.css";

import { Usuario } from "@repo/types";
import { getUsers } from "../server/user";

type Props = Omit<ImageProps, "src"> & {
  srcLight: string;
  srcDark: string;
};

const ThemeImage = (props: Props) => {
  const { srcLight, srcDark, ...rest } = props;

  return (
    <>
      <Image {...rest} src={srcLight} className="imgLight" />
      <Image {...rest} src={srcDark} className="imgDark" />
    </>
  );
};

export default async function Home() {
  let users: Usuario[] = [];
  let errorMessage: string | null = null;

  try {
    users = await getUsers();
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Erro ao carregar usuários";
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <ThemeImage
          className={styles.logo}
          srcLight="turborepo-dark.svg"
          srcDark="turborepo-light.svg"
          alt="Turborepo logo"
          width={180}
          height={38}
          priority
        />

        <li>
          <div className="text-white text-xl">Informações de usuário.</div>

          {errorMessage ? (
            <div>{errorMessage}</div>
          ) : users.length > 0 ? (
            users.map((user) => (
              <div key={user.id}>
                {user.id} - {user.nome_completo}
              </div>
            ))
          ) : (
            <div>Nenhum usuário encontrado.</div>
          )}
        </li>

        <Button appName="web" className={styles.secondary}>
          Open alert
        </Button>
      </main>
      <footer className={styles.footer}>
        <a
          href="https://vercel.com/templates?search=turborepo&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          href="https://turborepo.com?utm_source=create-turbo"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to turborepo.com →
        </a>
      </footer>
    </div>
  );
}
