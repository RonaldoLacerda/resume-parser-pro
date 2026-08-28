import { Campo, RadioSimNao, SelectInput, TextoInput } from "./Campos";
import { useCandidato } from "@/lib/candidate/store";
import { UFS } from "@/lib/candidate/opcoes";

export function EtapaDadosGerais() {
  const { candidato, set, preenchidosPelaIa } = useCandidato();
  const g = candidato.geral;
  const ia = (campo: string) => preenchidosPelaIa.has(`geral.${campo}`);
  const campo = (chave: keyof typeof g) => ({
    value: g[chave] as string,
    onChange: (e: { target: { value: string } }) => set("geral", { [chave]: e.target.value }),
    ia: ia(chave),
  });

  return (
    <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
      <Campo label="Nome Completo *" ia={ia("nomeCompleto")}>
        <TextoInput {...campo("nomeCompleto")} />
      </Campo>
      <Campo label="CPF" ia={ia("cpf")}>
        <TextoInput {...campo("cpf")} />
      </Campo>
      <Campo label="Email" ia={ia("email")}>
        <TextoInput type="email" {...campo("email")} />
      </Campo>

      <Campo label="Data de Nascimento" ia={ia("dataNascimento")}>
        <TextoInput placeholder="dd/mm/aaaa" {...campo("dataNascimento")} />
      </Campo>
      <Campo label="Como você nos encontrou?">
        <SelectInput defaultValue="">
          <option value="">Selecione</option>
          <option>Indicação</option>
          <option>Redes sociais</option>
          <option>Site da empresa</option>
        </SelectInput>
      </Campo>
      <Campo label="Sexo" ia={ia("sexo")}>
        <SelectInput {...campo("sexo")}>
          <option value="">Selecione</option>
          <option>Feminino</option>
          <option>Masculino</option>
          <option>Prefiro não informar</option>
        </SelectInput>
      </Campo>

      <Campo label="Nome do Pai" ia={ia("nomePai")}>
        <TextoInput {...campo("nomePai")} />
      </Campo>
      <Campo label="Nome da Mãe" ia={ia("nomeMae")}>
        <TextoInput {...campo("nomeMae")} />
      </Campo>
      <Campo label="Estado Civil" ia={ia("estadoCivil")}>
        <SelectInput {...campo("estadoCivil")}>
          <option value="">Selecione</option>
          <option>Solteiro(a)</option>
          <option>Casado(a)</option>
          <option>Divorciado(a)</option>
          <option>Viúvo(a)</option>
        </SelectInput>
      </Campo>

      <div className="grid grid-cols-[90px_1fr] gap-3">
        <Campo label="DDI">
          <TextoInput {...campo("ddiCelular")} placeholder="+55" />
        </Campo>
        <Campo label="Celular" ia={ia("celular")}>
          <TextoInput {...campo("celular")} />
        </Campo>
      </div>
      <Campo label="Telefone" ia={ia("telefone")}>
        <TextoInput {...campo("telefone")} />
      </Campo>
      <Campo label="RG" ia={ia("rg")}>
        <TextoInput {...campo("rg")} />
      </Campo>

      <Campo label="País de Nascimento" ia={ia("paisNascimento")}>
        <TextoInput {...campo("paisNascimento")} />
      </Campo>
      <Campo label="Estado de Nascimento" ia={ia("estadoNascimento")}>
        <SelectInput {...campo("estadoNascimento")}>
          <option value="">Selecione</option>
          {UFS.map((uf) => (
            <option key={uf}>{uf}</option>
          ))}
        </SelectInput>
      </Campo>
      <Campo label="Cidade de Nascimento" ia={ia("cidadeNascimento")}>
        <TextoInput {...campo("cidadeNascimento")} />
      </Campo>

      <RadioSimNao
        label="Possui antecedente criminal?"
        name="antecedente"
        value={""}
        onChange={() => undefined}
      />
    </div>
  );
}
