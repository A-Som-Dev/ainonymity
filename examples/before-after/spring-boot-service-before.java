package com.acme.orders.notification;

import com.acme.orders.model.Subscription;
import com.acme.orders.model.Project;
import com.acme.orders.model.Datalog;
import com.acme.orders.repository.SubscriptionRepository;
import com.acme.orders.repository.ProjectRepository;
import com.acme.orders.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationTriggerService {

  private final SubscriptionRepository subscriptionRepository;
  private final ProjectRepository projectRepository;
  private final UserService userService;

  public void processFieldChange(Datalog datalog) {
    Integer projectId = datalog.getIdproject();
    Project project = projectRepository.findById(projectId).orElse(null);
    List<Subscription> matches = subscriptionRepository.findMatchingFieldSubscriptions(
        datalog.getIdinputfield(), projectId);

    for (Subscription sub : matches) {
      Integer subscriberId = sub.getIduser();
      if (!userService.hasProjectAccess(subscriberId, projectId)) {
        log.info("Skipping subscription {} for user {}: no project access",
            sub.getIdsubscription(), subscriberId);
        continue;
      }
      createMessageFromSubscription(sub, datalog);
    }
  }

  private void createMessageFromSubscription(Subscription sub, Datalog datalog) {
    // TODO: merge with NotificationTriggerService V2 once projectlog is live
  }
}
