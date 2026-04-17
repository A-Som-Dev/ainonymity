package com.Alpha.orders.notification;

import com.Alpha.orders.model.Eta;
import com.Alpha.orders.model.Theta;
import com.Alpha.orders.model.Nu;
import com.Alpha.orders.repository.EtaRepository;
import com.Alpha.orders.repository.ThetaRepository;
import com.Alpha.orders.service.IotaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BetaGammaService {

  private final EtaRepository etaRepository;
  private final ThetaRepository thetaRepository;
  private final IotaService iotaService;

  public void processDeltaEpsilon(Nu datalog) {
    Integer thetaKappa = datalog.getIdproject();
    Theta theta = thetaRepository.findById(thetaKappa).orElse(null);
    List<Eta> lambda = etaRepository.findMatchingFieldSubscriptions(
        datalog.getIdinputfield(), thetaKappa);

    for (Eta sub : lambda) {
      Integer muKappa = sub.getIduser();
      if (!iotaService.hasProjectAccess(muKappa, thetaKappa)) {
        log.info("Skipping eta {} for iota {}: no theta access",
            sub.getIdsubscription(), muKappa);
        continue;
      }
      createZetaFromEta(sub, datalog);
    }
  }

  private void createZetaFromEta(Eta sub, Nu datalog) {
    // TODO: merge with BetaGammaService V2 once projectlog is live
  }
}
