import { Campo, SelectInput, TextoInput } from "./Campos";
import { UFS } from "@/lib/candidate/opcoes";
import { useCandidato } from "@/lib/candidate/store";

export function EtapaEndereco() {
  const { candidato, set, preenchidosPelaIa } = useCandidato();
  const e = candidato.endereco;
  const ia = (c: string) => preenchidosPelaIa.has(`endereco.${c}`);
  const campo = (chave: keyof typeof e) => ({
    value: e[chave],
    onChange: (ev: { target: { value: string } }) => set("endereco", { [chave]: ev.target.value }),
    ia: ia(chave),
  });

  return (
    <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
      <Campo label="País" ia={ia("pais")}>
        <TextoInput {...campo("pais")} />
      </Campo>
      <Campo label="CEP" ia={ia("cep")}>
        <TextoInput {...campo("cep")} />
      </Campo>
      <Campo label="Estado" ia={ia("estado")}>
        <SelectInput {...campo("estado")}>
          <option value="">Selecione</option>
          {UFS.map((uf) => (
            <option key={uf}>{uf}</option>
          ))}
        </SelectInput>
      </Campo>
      <Campo label="Cidade" ia={ia("cidade")}>
        <TextoInput {...campo("cidade")} placeholder="Selecione o estado" />
      </Campo>
      <Campo label="Bairro" ia={ia("bairro")}>
        <TextoInput {...campo("bairro")} />
      </Campo>
      <Campo label="Logradouro (Endereço)" ia={ia("logradouro")}>
        <TextoInput {...campo("logradouro")} />
      </Campo>
      <Campo label="Número" ia={ia("numero")}>
        <TextoInput {...campo("numero")} />
      </Campo>
      <Campo label="Complemento" ia={ia("complemento")}>
        <TextoInput {...campo("complemento")} />
      </Campo>
      <Campo label="Ponto de Referência" ia={ia("pontoReferencia")}>
        <TextoInput {...campo("pontoReferencia")} />
      </Campo>
      <Campo label="Região" ia={ia("regiao")}>
        <TextoInput {...campo("regiao")} />
      </Campo>

    </div>
  );
}
